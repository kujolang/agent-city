import { defineConfig } from "vite";
import { resolve } from "node:path";
import { browserFileBoundary } from "./file-boundary.ts";
const boundary = browserFileBoundary(resolve(import.meta.dirname, "../.."));
export default defineConfig({
  publicDir: false,
  plugins: [boundary.plugin],
  server: {
    fs: boundary.fs,
    host: "127.0.0.1",
    port: Number(process.env.CITY_WEB_PORT || 5178),
    strictPort: true,
    proxy: {
      "/control": process.env.CITY_CONTROL_URL || "http://127.0.0.1:7793",
      "/api": process.env.CITY_GATEWAY_URL || "http://127.0.0.1:7792",
    },
  },
  build: { chunkSizeWarningLimit: 800 },
});
