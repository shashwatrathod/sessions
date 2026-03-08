import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1", // bind to IPv4 so Spotify's redirect to 127.0.0.1:5173 connects
    proxy: {
      // All backend routes are prefixed with /api.
      // Vite strips the /api prefix and forwards to the backend.
      // This keeps everything on one origin so HTTP-only cookies work.
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
});
