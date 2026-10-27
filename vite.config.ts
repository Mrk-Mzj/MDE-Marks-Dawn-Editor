import { defineConfig } from "vite";

// Tauri expects a fixed dev port and serves the built files from dist/.
export default defineConfig({
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
    // Emit imported images as files: the CSP (img-src 'self') blocks the
    // data: URLs Vite would inline small ones as (e.g. the About icon).
    assetsInlineLimit: 0,
  },
});
