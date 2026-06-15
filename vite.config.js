import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// ─── Vercel CDN Fix: Remove crossorigin from ALL built assets ───────────────
// Vite adds crossorigin to <script type="module"> and <link rel="stylesheet">
// tags. On Vercel's CDN, these attributes trigger CORS preflight checks that
// can fail, resulting in CSS 404 errors and blank pages.
//
// Fix: Strip ALL crossorigin attributes from the built index.html using a
// two-layer approach:
//   1. transformIndexHtml — modifies HTML during Vite's build pipeline
//   2. writeBundle — post-processes the file on disk AFTER all plugins finish
//
// The writeBundle hook is the reliable fallback: it reads the final index.html
// from the output directory and removes any remaining crossorigin attributes
// that Vite or other plugins may have injected after transformIndexHtml ran.

function removeCrossoriginPlugin() {
  return {
    name: "remove-crossorigin-all",

    // Layer 1: Transform during Vite's HTML pipeline
    transformIndexHtml(html) {
      return html
        .replace(/(<link[^>]*?)\s+crossorigin(\s*=\s*"[^"]*")?/g, "$1")
        .replace(/(<script[^>]*?)\s+crossorigin(\s*=\s*"[^"]*")?/g, "$1");
    },

    // Layer 2: Post-process the final file on disk (guaranteed to run last)
    writeBundle(options) {
      const outDir = options.dir || "dist";
      const htmlPath = resolve(outDir, "index.html");
      try {
        let html = readFileSync(htmlPath, "utf-8");
        const cleaned = html
          .replace(/(<link[^>]*?)\s+crossorigin(\s*=\s*"[^"]*")?/g, "$1")
          .replace(/(<script[^>]*?)\s+crossorigin(\s*=\s*"[^"]*")?/g, "$1");
        if (cleaned !== html) {
          writeFileSync(htmlPath, cleaned, "utf-8");
          console.log("✓ remove-crossorigin: cleaned crossorigin from index.html (writeBundle)");
        }
      } catch (e) {
        // Non-fatal — the transformIndexHtml hook may have already handled it
        console.warn("remove-crossorigin writeBundle:", e.message);
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
        // Use 8-char hex hashes — compatible with SW regex and all CDNs
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
