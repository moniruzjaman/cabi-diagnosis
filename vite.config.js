import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
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
