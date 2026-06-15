import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ─── Vercel CDN Fix: Remove crossorigin from ALL built assets ───────────────
// Vite adds crossorigin to <script type="module"> and <link rel="stylesheet">
// tags. On Vercel's CDN, these attributes trigger CORS preflight checks that
// fail because static assets lack Access-Control-Allow-Origin headers.
// The result: CSS returns 404 / JS fails silently → blank page.
//
// Fix: strip ALL crossorigin attributes from the built index.html so the
// browser makes same-origin requests that bypass CORS entirely.
function removeCrossoriginFromBuiltHtml() {
  return {
    name: "remove-crossorigin-all",
    transformIndexHtml(html) {
      // Remove crossorigin attribute from any tag (script, link, etc.)
      return html
        .replace(/(<link[^>]*?)\s+crossorigin(\s*=\s*"[^"]*")?/g, "$1")
        .replace(/(<script[^>]*?)\s+crossorigin(\s*=\s*"[^"]*")?/g, "$1");
    },
  };
}

export default defineConfig({
  plugins: [react(), removeCrossoriginFromBuiltHtml()],
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
