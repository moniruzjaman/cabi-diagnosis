import ort from "onnxruntime-web";

export const ortNs = ort && ort.InferenceSession ? ort : ort && ort.default ? ort.default : ort;

export const ORT_WASM_PATHS = "/assets/";
export const IMAGENET_MEAN = [0.485, 0.456, 0.406];
export const IMAGENET_STD = [0.229, 0.224, 0.225];

export function configureOrt() {
  if (ortNs?.env?.wasm) {
    ortNs.env.wasm.wasmPaths = ORT_WASM_PATHS;
  }
}

export function softmax(logits) {
  let max = -Infinity;
  for (let i = 0; i < logits.length; i++) if (logits[i] > max) max = logits[i];
  const exps = new Float32Array(logits.length);
  let sum = 0;
  for (let i = 0; i < logits.length; i++) {
    exps[i] = Math.exp(logits[i] - max);
    sum += exps[i];
  }
  for (let i = 0; i < exps.length; i++) exps[i] /= sum;
  return exps;
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const isSameOrigin =
      typeof src === "string" && (src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("/"));
    if (!isSameOrigin) {
      reject(new Error("Remote image source not supported — pass a data: or blob: URL"));
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image load failed (local)"));
    img.src = src;
  });
}

export function imageToTensor(img, imageSize, opts = {}) {
  const resizeShort = opts.resizeShort || imageSize;
  const centerCrop = opts.centerCrop !== false;
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  let drawW = srcW;
  let drawH = srcH;
  let sx = 0;
  let sy = 0;
  let sWidth = srcW;
  let sHeight = srcH;

  if (centerCrop && srcW > 0 && srcH > 0) {
    const scale = resizeShort / Math.min(srcW, srcH);
    drawW = Math.max(1, Math.round(srcW * scale));
    drawH = Math.max(1, Math.round(srcH * scale));
    sx = Math.max(0, Math.floor((drawW - imageSize) / 2));
    sy = Math.max(0, Math.floor((drawH - imageSize) / 2));
    sWidth = Math.min(imageSize, drawW);
    sHeight = Math.min(imageSize, drawH);
  } else {
    drawW = imageSize;
    drawH = imageSize;
    sWidth = imageSize;
    sHeight = imageSize;
  }

  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(imageSize, imageSize)
      : Object.assign(document.createElement("canvas"), { width: imageSize, height: imageSize });
  if (canvas.width !== imageSize) canvas.width = imageSize;
  if (canvas.height !== imageSize) canvas.height = imageSize;
  const ctx = canvas.getContext("2d");

  if (centerCrop && (drawW !== srcW || drawH !== srcH)) {
    const tmp =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(drawW, drawH)
        : Object.assign(document.createElement("canvas"), { width: drawW, height: drawH });
    tmp.width = drawW;
    tmp.height = drawH;
    tmp.getContext("2d").drawImage(img, 0, 0, drawW, drawH);
    ctx.drawImage(tmp, sx, sy, sWidth, sHeight, 0, 0, imageSize, imageSize);
  } else {
    ctx.drawImage(img, 0, 0, imageSize, imageSize);
  }

  const { data } = ctx.getImageData(0, 0, imageSize, imageSize);
  const float32Data = new Float32Array(1 * 3 * imageSize * imageSize);
  const planeSize = imageSize * imageSize;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    float32Data[p] = (data[i] / 255 - IMAGENET_MEAN[0]) / IMAGENET_STD[0];
    float32Data[p + planeSize] = (data[i + 1] / 255 - IMAGENET_MEAN[1]) / IMAGENET_STD[1];
    float32Data[p + 2 * planeSize] = (data[i + 2] / 255 - IMAGENET_MEAN[2]) / IMAGENET_STD[2];
  }
  return new ortNs.Tensor("float32", float32Data, [1, 3, imageSize, imageSize]);
}

export async function createOnnxSession(modelUrl) {
  configureOrt();
  return ortNs.InferenceSession.create(modelUrl, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });
}
