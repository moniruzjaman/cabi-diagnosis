import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Custom plugin to remove crossorigin from CSS link tags in built HTML
// This prevents CSP/CORS 404 errors on Vercel CDN
function removeCrossoriginFromCSS() {
  return {
    name: "remove-crossorigin-css",
    transformIndexHtml(html) {
      return html.replace(
        /<link([^>]*?)rel="stylesheet"([^>]*?)crossorigin([^>]*?)>/g,
        '<link$1rel="stylesheet"$2$3>'
      ).replace(
        /<link([^>]*?)crossorigin([^>]*?)rel="stylesheet"([^>]*?)>/g,
        '<link$1$2rel="stylesheet"$3>'
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), removeCrossoriginFromCSS()],
  build: {
    outDir: "dist",
    sourcemap: false,
    cssCodeSplit: true,
    // Ensure consistent long hashes for cache-busting
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash:16].js`,
        chunkFileNames: `assets/[name]-[hash:16].js`,
        assetFileNames: `assets/[name]-[hash:16].[ext]`,
      },
    },
  },
  server: {
    port: 3000,
  },
});
