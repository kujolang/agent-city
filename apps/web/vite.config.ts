import { defineConfig } from "vite";
export default defineConfig({
  server: {
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
