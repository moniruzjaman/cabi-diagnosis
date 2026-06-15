import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// ─── Vercel CDN Fix: Remove crossorigin from built index.html ──────────────
// Vite 5 always adds crossorigin to <script type="module"> and <link
// rel="stylesheet"> tags during its internal HTML generation phase. On
// Vercel's CDN, these crossorigin attributes cause CORS failures because
// the browser treats them as cross-origin requests, resulting in CSS 404s
// and blank pages.
//
// IMPORTANT: The transformIndexHtml hook runs BEFORE Vite's internal HTML
// generation, so it CANNOT remove crossorigin that hasn't been added yet.
// Only the closeBundle hook (which runs after ALL files are written) can
// reliably strip these attributes from the final output.

function removeCrossoriginPlugin() {
  return {
    name: "remove-crossorigin-final",

    // closeBundle runs AFTER writeBundle — guaranteed last hook before build ends
    closeBundle() {
      const htmlPath = resolve("dist", "index.html");
      try {
        let html = readFileSync(htmlPath, "utf-8");
        const cleaned = html
          .replace(/(<link[^>]*?)\s+crossorigin(\s*=\s*"[^"]*")?/g, "$1")
          .replace(/(<script[^>]*?)\s+crossorigin(\s*=\s*"[^"]*")?/g, "$1");
        if (cleaned !== html) {
          writeFileSync(htmlPath, cleaned, "utf-8");
          console.log("✓ remove-crossorigin: stripped crossorigin from dist/index.html");
        } else {
          console.log("✓ remove-crossorigin: index.html already clean");
        }
      } catch (e) {
        console.warn("remove-crossorigin:", e.message);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), removeCrossoriginPlugin()],
  build: {
    outDir: "dist",
    sourcemap: false,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
  server: {
    port: 3000,
  },
});
