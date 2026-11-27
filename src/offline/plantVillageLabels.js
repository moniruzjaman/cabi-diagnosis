// PlantVillage 15-class label table (MobileNetV3 + trained-128).
// Order MUST match models/plantvillage/*/class_names.json.
//
// Phase 1 (Workstream B):
//   - canonicalCropId pins every class to its canonical crop ID
//     (crop-registry-v1.json identity). The Pepper__bell classes belong to
//     capsicum_bell (bell/sweet pepper, মিষ্টি মরিচ) ONLY — never to chili,
//     ornamental_pepper, black_pepper or brinjal.
//   - Bell pepper display labels corrected: these classes were previously
//     displayed as "মরিচ" (chilli), which presented bell-pepper model output
//     as chilli diagnoses.
//   - validatePlantVillageLabels() fail-closed self-check runs at classifier
//     load time (see plantVillageClassifier.js).

export const PLANTVILLAGE_LABELS = [
  {
    idx: 0,
    raw: "Pepper__bell___Bacterial_spot",
    canonicalCropId: "capsicum_bell",
    cropEn: "Bell pepper",
    cropBn: "মিষ্টি মরিচ",
    diseaseEn: "Bacterial Spot",
    diseaseBn: "ব্যাকটেরিয়াল স্পট",
    isHealthy: false,
    category: "bacterial",
  },
  {
    idx: 1,
    raw: "Pepper__bell___healthy",
    canonicalCropId: "capsicum_bell",
    cropEn: "Bell pepper",
    cropBn: "মিষ্টি মরিচ",
    diseaseEn: "Healthy",
    diseaseBn: "সুস্থ",
    isHealthy: true,
    category: "healthy",
  },
  {
    idx: 2,
    raw: "Potato___Early_blight",
    canonicalCropId: "potato",
    cropEn: "Potato",
    cropBn: "আলু",
    diseaseEn: "Early Blight",
    diseaseBn: "আগাম ঝলসা",
    isHealthy: false,
    category: "fungal",
  },
  {
    idx: 3,
    raw: "Potato___Late_blight",
    canonicalCropId: "potato",
    cropEn: "Potato",
    cropBn: "আলু",
    diseaseEn: "Late Blight",
    diseaseBn: "বিলম্বিত ঝলসা",
    isHealthy: false,
    category: "fungal",
  },
  {
    idx: 4,
    raw: "Potato___healthy",
    canonicalCropId: "potato",
    cropEn: "Potato",
    cropBn: "আলু",
    diseaseEn: "Healthy",
    diseaseBn: "সুস্থ",
    isHealthy: true,
    category: "healthy",
  },
  {
    idx: 5,
    raw: "Tomato_Bacterial_spot",
    canonicalCropId: "tomato",
    cropEn: "Tomato",
    cropBn: "টমেটো",
    diseaseEn: "Bacterial Spot",
    diseaseBn: "ব্যাকটেরিয়াল স্পট",
    isHealthy: false,
    category: "bacterial",
  },
  {
    idx: 6,
    raw: "Tomato_Early_blight",
    canonicalCropId: "tomato",
    cropEn: "Tomato",
    cropBn: "টমেটো",
    diseaseEn: "Early Blight",
    diseaseBn: "আগাম ঝলসা",
    isHealthy: false,
    category: "fungal",
  },
  {
    idx: 7,
    raw: "Tomato_Late_blight",
    canonicalCropId: "tomato",
    cropEn: "Tomato",
    cropBn: "টমেটো",
    diseaseEn: "Late Blight",
    diseaseBn: "বিলম্বিত ঝলসা",
    isHealthy: false,
    category: "fungal",
  },
  {
    idx: 8,
    raw: "Tomato_Leaf_Mold",
    canonicalCropId: "tomato",
    cropEn: "Tomato",
    cropBn: "টমেটো",
    diseaseEn: "Leaf Mold",
    diseaseBn: "পাতার ছাঁচ",
    isHealthy: false,
    category: "fungal",
  },
  {
    idx: 9,
    raw: "Tomato_Septoria_leaf_spot",
    canonicalCropId: "tomato",
    cropEn: "Tomato",
    cropBn: "টমেটো",
    diseaseEn: "Septoria Leaf Spot",
    diseaseBn: "সেপ্টোরিয়া পাতার দাগ",
    isHealthy: false,
    category: "fungal",
  },
  {
    idx: 10,
    raw: "Tomato_Spider_mites_Two_spotted_spider_mite",
    canonicalCropId: "tomato",
    cropEn: "Tomato",
    cropBn: "টমেটো",
    diseaseEn: "Spider Mites",
    diseaseBn: "মাকড়সা মাইট",
    isHealthy: false,
    category: "insect",
  },
  {
    idx: 11,
    raw: "Tomato__Target_Spot",
    canonicalCropId: "tomato",
    cropEn: "Tomato",
    cropBn: "টমেটো",
    diseaseEn: "Target Spot",
    diseaseBn: "টার্গেট স্পট",
    isHealthy: false,
    category: "fungal",
  },
  {
    idx: 12,
    raw: "Tomato__Tomato_YellowLeaf__Curl_Virus",
    canonicalCropId: "tomato",
    cropEn: "Tomato",
    cropBn: "টমেটো",
    diseaseEn: "Tomato Yellow Leaf Curl",
    diseaseBn: "হলুদ পাতা কুঁকড়ানো ভাইরাস",
    isHealthy: false,
    category: "viral",
  },
  {
    idx: 13,
    raw: "Tomato__Tomato_mosaic_virus",
    canonicalCropId: "tomato",
    cropEn: "Tomato",
    cropBn: "টমেটো",
    diseaseEn: "Tomato Mosaic",
    diseaseBn: "মোজাইক ভাইরাস",
    isHealthy: false,
    category: "viral",
  },
  {
    idx: 14,
    raw: "Tomato_healthy",
    canonicalCropId: "tomato",
    cropEn: "Tomato",
    cropBn: "টমেটো",
    diseaseEn: "Healthy",
    diseaseBn: "সুস্থ",
    isHealthy: true,
    category: "healthy",
  },
];

// Canonical crop -> class labels (mirrors model-coverage-v1.json cropClassMap
// for the PlantVillage engines; single source of truth is the label table).
export const PLANTVILLAGE_CROP_CLASS_MAP = PLANTVILLAGE_LABELS.reduce((acc, l) => {
  (acc[l.canonicalCropId] ||= []).push(l.raw);
  return acc;
}, {});

// Crop IDs the PlantVillage engine is validated for (model-coverage-v1.json).
export const PLANTVILLAGE_VALIDATED_CROP_IDS = ["capsicum_bell", "potato", "tomato"];

/**
 * Fail-closed consistency check over the bundled label table. Returns
 * { ok, errors[] }; ok=false means the vision engine must NOT be used.
 * Checks: exact count, sequential idx, unique raw labels, canonical crop IDs,
 * and that the Pepper__bell classes map ONLY to capsicum_bell.
 */
export function validatePlantVillageLabels(labels = PLANTVILLAGE_LABELS, expectedCount = 15) {
  const errors = [];
  if (!Array.isArray(labels) || labels.length !== expectedCount) {
    errors.push(
      `expected ${expectedCount} labels, got ${Array.isArray(labels) ? labels.length : String(labels?.length)}`,
    );
    return { ok: false, errors };
  }
  const seen = new Set();
  labels.forEach((l, i) => {
    if (l.idx !== i) errors.push(`label ${i}: idx mismatch (${l.idx})`);
    if (!l.raw || typeof l.raw !== "string") errors.push(`label ${i}: missing raw`);
    else if (seen.has(l.raw)) errors.push(`label ${i}: duplicate raw ${l.raw}`);
    else seen.add(l.raw);
    if (!PLANTVILLAGE_VALIDATED_CROP_IDS.includes(l.canonicalCropId)) {
      errors.push(`label ${i}: canonicalCropId ${l.canonicalCropId} not validated`);
    }
  });
  const pepperClasses = labels.filter((l) => l.raw.startsWith("Pepper__bell"));
  if (pepperClasses.length !== 2) errors.push(`expected exactly 2 Pepper__bell classes, got ${pepperClasses.length}`);
  for (const p of pepperClasses) {
    if (p.canonicalCropId !== "capsicum_bell") {
      errors.push(`pepper class ${p.raw} must map to capsicum_bell, got ${p.canonicalCropId}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export const PLANTVILLAGE_MODEL_PRESETS = {
  light: {
    id: "plantvillage-mobilenetv3-light",
    url: "/models/plantvillage/mobilenetv3-light/model.onnx",
    classNamesUrl: "/models/plantvillage/mobilenetv3-light/class_names.json",
    imageSize: 224,
    resizeShort: 256,
    label: "PlantVillage MobileNetV3",
    sizeMb: 4.4,
  },
  tiny: {
    id: "plantvillage-trained-128",
    url: "/models/plantvillage/trained-128/model.onnx",
    classNamesUrl: "/models/plantvillage/trained-128/class_names.json",
    imageSize: 128,
    resizeShort: 146,
    label: "PlantVillage Tiny 128",
    sizeMb: 2.3,
  },
};

export function entryFromLabel(idx, confidence) {
  const meta = PLANTVILLAGE_LABELS[idx] || {};
  return {
    idx,
    label: meta.raw || `class_${idx}`,
    canonicalCropId: meta.canonicalCropId || null,
    cropEn: meta.cropEn || null,
    cropBn: meta.cropBn || null,
    diseaseEn: meta.diseaseEn || null,
    diseaseBn: meta.diseaseBn || null,
    isHealthy: !!meta.isHealthy,
    category: meta.category || "unknown",
    confidence: Number(confidence) || 0,
    pctDisplay: `${Math.round((Number(confidence) || 0) * 100)}%`,
  };
}
