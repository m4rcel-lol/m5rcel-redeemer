import { defineConfig } from "vite";

export default defineConfig({
  envDir: false,
  publicDir: "public",
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
    sourcemap: false
  },
  server: {
    port: 5173
  }
});
