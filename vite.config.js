import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// ─── Vercel CDN Fix: Remove crossorigin from built index.html ──────────────
// Vite 5 adds crossorigin to <script type="module"> and <link rel="stylesheet">
// during its internal HTML generation. On Vercel's CDN, these cause CORS 404s.
//
// The enforce: "post" option ensures transformIndexHtml runs AFTER Vite's
// internal HTML generation, so it can remove the crossorigin attributes that
// Vite just added. The closeBundle hook is a safety net that post-processes
// the file on disk as the very last step of the build.

function removeCrossoriginPlugin() {
  return {
    name: "remove-crossorigin-post",
    enforce: "post",

    // Runs AFTER Vite's internal HTML generation (enforce: "post")
    transformIndexHtml(html) {
      return html
        .replace(/(<link[^>]*?)\s+crossorigin(\s*=\s*"[^"]*")?/g, "$1")
        .replace(/(<script[^>]*?)\s+crossorigin(\s*=\s*"[^"]*")?/g, "$1");
    },

    // Safety net: strip any remaining crossorigin from the final file on disk
    closeBundle() {
      try {
        const htmlPath = resolve(process.cwd(), "dist", "index.html");
        let html = readFileSync(htmlPath, "utf-8");
        const cleaned = html
          .replace(/(<link[^>]*?)\s+crossorigin(\s*=\s*"[^"]*")?/g, "$1")
          .replace(/(<script[^>]*?)\s+crossorigin(\s*=\s*"[^"]*")?/g, "$1");
        if (cleaned !== html) {
          writeFileSync(htmlPath, cleaned, "utf-8");
          console.log("✓ remove-crossorigin: stripped from dist/index.html (closeBundle)");
        }
      } catch (_) { /* non-fatal */ }
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
