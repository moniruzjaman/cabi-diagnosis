import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ─── Vercel CDN Fix: Remove crossorigin from built HTML ─────────────────────
// Vite 5 adds crossorigin to <script type="module"> and <link rel="stylesheet">
// during its internal HTML generation phase. On Vercel's CDN, these cause
// CORS preflight failures → CSS 404 → blank page.
//
// enforce: "post" ensures this plugin's transformIndexHtml runs AFTER Vite's
// internal HTML generation, so it can remove crossorigin that Vite just added.
// No file-system operations needed — pure in-memory HTML transformation.

function removeCrossoriginPlugin() {
  return {
    name: "remove-crossorigin-post",
    enforce: "post",
    transformIndexHtml(html) {
      return html
        .replace(/(<link[^>]*?)\s+crossorigin(\s*=\s*"[^"]*")?/g, "$1")
        .replace(/(<script[^>]*?)\s+crossorigin(\s*=\s*"[^"]*")?/g, "$1");
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
