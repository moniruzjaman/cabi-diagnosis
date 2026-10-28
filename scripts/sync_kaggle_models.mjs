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

const COPIES = [
  {
    from: ["models", "plantvillage_mobilenetv3_light", "model.onnx"],
    to: ["plantvillage", "mobilenetv3-light", "model.onnx"],
  },
  {
    from: ["models", "plantvillage_mobilenetv3_light", "class_names.json"],
    to: ["plantvillage", "mobilenetv3-light", "class_names.json"],
  },
  {
    from: ["models", "plantvillage_trained", "model.onnx"],
    to: ["plantvillage", "trained-128", "model.onnx"],
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

if (CHECK_ONLY) {
  const missing = COPIES.filter((item) => !fs.existsSync(path.join(DEST, ...item.to)));
  if (missing.length) {
    console.error("Missing model files:\n" + missing.map((m) => "  " + m.to.join("/")).join("\n"));
    process.exit(1);
  }
  console.log("Kaggle mobile models present.");
  process.exit(0);
}

const sha = ensureUpstream();
copyModels();
console.log(`Synced kaggle-dataset @ ${sha}`);
