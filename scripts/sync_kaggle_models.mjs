#!/usr/bin/env node
/**
 * Sync on-device ONNX models from https://github.com/moniruzjaman/kaggle-dataset
 *
 * Copies the mobile PlantVillage models (and optional ViT) into public/models.
 * Diagnosis photos are never uploaded — only model weights + class names.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const UPSTREAM_URL = "https://github.com/moniruzjaman/kaggle-dataset.git";
const UPSTREAM_DIR = path.join(REPO_ROOT, ".kaggle-upstream");
const DEST = path.join(REPO_ROOT, "public", "models");
const CHECK_ONLY = process.argv.includes("--check");

const EXPECTED_CLASSES = [
  "Pepper__bell___Bacterial_spot",
  "Pepper__bell___healthy",
  "Potato___Early_blight",
  "Potato___Late_blight",
  "Potato___healthy",
  "Tomato_Bacterial_spot",
  "Tomato_Early_blight",
  "Tomato_Late_blight",
  "Tomato_Leaf_Mold",
  "Tomato_Septoria_leaf_spot",
  "Tomato_Spider_mites_Two_spotted_spider_mite",
  "Tomato__Target_Spot",
  "Tomato__Tomato_YellowLeaf__Curl_Virus",
  "Tomato__Tomato_mosaic_virus",
  "Tomato_healthy",
];

const COPIES = [
  {
    from: ["models", "plantvillage_mobilenetv3_light", "model.onnx"],
    to: ["plantvillage", "mobilenetv3-light", "model.onnx"],
    minBytes: 3_500_000,
  },
  {
    from: ["models", "plantvillage_mobilenetv3_light", "class_names.json"],
    to: ["plantvillage", "mobilenetv3-light", "class_names.json"],
  },
  {
    from: ["models", "plantvillage_trained", "model.onnx"],
    to: ["plantvillage", "trained-128", "model.onnx"],
    minBytes: 1_500_000,
  },
  {
    from: ["models", "plantvillage_trained", "class_names.json"],
    to: ["plantvillage", "trained-128", "class_names.json"],
  },
];

function sh(cmd) {
  return execSync(cmd, { encoding: "utf-8", cwd: REPO_ROOT, stdio: "pipe" }).trim();
}

function ensureUpstream() {
  if (!fs.existsSync(path.join(UPSTREAM_DIR, ".git"))) {
    console.log("Cloning kaggle-dataset …");
    sh(`git clone --depth 1 ${UPSTREAM_URL} ${UPSTREAM_DIR}`);
  } else {
    sh(`git -C ${UPSTREAM_DIR} fetch --depth 1 origin`);
    sh(`git -C ${UPSTREAM_DIR} reset --hard FETCH_HEAD`);
  }
  return sh(`git -C ${UPSTREAM_DIR} rev-parse --short HEAD`);
}

function copyModels() {
  for (const item of COPIES) {
    const src = path.join(UPSTREAM_DIR, ...item.from);
    const dest = path.join(DEST, ...item.to);
    if (!fs.existsSync(src)) {
      throw new Error(`Missing upstream file: ${src}`);
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    const mb = (fs.statSync(dest).size / (1024 * 1024)).toFixed(2);
    console.log(`copied ${item.to.join("/")} (${mb} MB)`);
  }
}

function isOnnx(filePath) {
  const header = Buffer.alloc(8);
  const fd = fs.openSync(filePath, "r");
  fs.readSync(fd, header, 0, 8, 0);
  fs.closeSync(fd);
  if (header.slice(0, 5).toString("ascii") === "<!DOC" || header.slice(0, 4).toString("ascii") === "http") {
    return false;
  }
  return header[0] === 0x08 || header[0] === 0x0a;
}

function checkClassNames(filePath) {
  const labels = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(labels) || labels.length !== EXPECTED_CLASSES.length) {
    throw new Error(`${filePath} must have ${EXPECTED_CLASSES.length} classes`);
  }
  for (let i = 0; i < EXPECTED_CLASSES.length; i++) {
    if (labels[i] !== EXPECTED_CLASSES[i]) {
      throw new Error(`${filePath} class ${i} is ${labels[i]}, expected ${EXPECTED_CLASSES[i]}`);
    }
  }
}

if (CHECK_ONLY) {
  const errors = [];
  for (const item of COPIES) {
    const dest = path.join(DEST, ...item.to);
    if (!fs.existsSync(dest)) {
      errors.push(`missing ${item.to.join("/")}`);
      continue;
    }
    const size = fs.statSync(dest).size;
    if (item.minBytes && size < item.minBytes) {
      errors.push(`${item.to.join("/")} too small (${size} bytes)`);
    }
    if (dest.endsWith(".onnx") && !isOnnx(dest)) {
      errors.push(`${item.to.join("/")} is not a protobuf/ONNX file`);
    }
    if (dest.endsWith("class_names.json")) {
      try {
        checkClassNames(dest);
      } catch (err) {
        errors.push(err.message);
      }
    }
  }
  const vit = path.join(DEST, "crop_leaf_diseases_vit.onnx");
  if (!fs.existsSync(vit) || fs.statSync(vit).size < 10_000_000) {
    errors.push("missing or tiny ViT model at models/crop_leaf_diseases_vit.onnx");
  }
  const manifestPath = path.join(DEST, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    errors.push("missing models/manifest.json");
  } else {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const ids = (manifest.engines || []).map((e) => e.id);
    for (const id of ["plantvillage-mobilenetv3-light", "plantvillage-trained-128"]) {
      if (!ids.includes(id)) errors.push(`manifest missing engine ${id}`);
    }
  }
  if (errors.length) {
    console.error("Kaggle model check failed:\n" + errors.map((e) => "  " + e).join("\n"));
    process.exit(1);
  }
  console.log("Kaggle PlantVillage MobileNet models present and valid.");
  process.exit(0);
}

const sha = ensureUpstream();
copyModels();
console.log(`Synced kaggle-dataset @ ${sha}`);
