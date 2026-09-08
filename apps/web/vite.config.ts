import { defineConfig } from "vite";
export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 5178,
    strictPort: true,
    proxy: { "/api": process.env.CITY_GATEWAY_URL || "http://127.0.0.1:7792" },
  },
  build: { chunkSizeWarningLimit: 800 },
});
