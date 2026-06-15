#!/usr/bin/env node
// strip-crossorigin.js — Post-build script to remove crossorigin attributes
// from the built index.html. This is Layer 3 of the crossorigin removal defense.
//
// Layer 1: Vite transformIndexHtml hook (runs during build pipeline)
// Layer 2: Vite writeBundle hook (post-processes file on disk after build)
// Layer 3: This script (runs via npm build command after vite build completes)
//
// This triple-defense approach guarantees crossorigin is removed regardless of
// Vite's plugin execution order or Vercel's build environment quirks.

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = resolve(__dirname, "..", "dist", "index.html");

try {
  let html = readFileSync(htmlPath, "utf-8");
  const cleaned = html
    .replace(/(<link[^>]*?)\s+crossorigin(\s*=\s*"[^"]*")?/g, "$1")
    .replace(/(<script[^>]*?)\s+crossorigin(\s*=\s*"[^"]*")?/g, "$1");

  if (cleaned !== html) {
    writeFileSync(htmlPath, cleaned, "utf-8");
    console.log("✓ strip-crossorigin: removed crossorigin attributes from dist/index.html");
  } else {
    console.log("✓ strip-crossorigin: no crossorigin attributes found (already clean)");
  }
} catch (err) {
  console.error("✗ strip-crossorigin: failed —", err.message);
  process.exit(1);
}
