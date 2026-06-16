import { defineConfig } from "vite";

export default defineConfig({
  publicDir: "public",
  build: {
    outDir: "dist",
    sourcemap: false
  },
  server: {
    port: 5173
  }
});
