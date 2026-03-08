import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const VITE_HOST = env.VITE_HOST || "127.0.0.1";
  const VITE_BACKEND_URL = env.VITE_BACKEND_URL || "http://127.0.0.1:3000";

  return {
    plugins: [react()],
    server: {
      host: VITE_HOST, // bind to IPv4 so Spotify's redirect to 127.0.0.1:5173 connects
      proxy: {
        // All backend routes are prefixed with /api.
        // Vite strips the /api prefix and forwards to the backend.
        // This keeps everything on one origin so HTTP-only cookies work.
        "/api": {
          target: VITE_BACKEND_URL,
          changeOrigin: true,
        },
      },
    },
  };
});
