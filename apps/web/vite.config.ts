import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@transfer-file/shared": path.resolve(
        __dirname,
        "../../packages/shared/src/index.ts",
      ),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "https://localhost:8787",
        changeOrigin: true,
        secure: false,
      },
      "/ws": {
        target: "wss://localhost:8787",
        ws: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
