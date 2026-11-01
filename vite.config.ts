import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { viteSourceLocator } from "@metagptx/vite-plugin-source-locator";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Read .env here too, so a plain `npm run dev` proxies to the same API port that
  // `npm run dev:full` starts, instead of silently aiming at a dead one.
  const env = loadEnv(mode, process.cwd(), "");
  const apiPort = env.API_PORT || process.env.API_PORT || "3002";

  return {
    plugins: [
      viteSourceLocator({
        prefix: "mgx",
      }),
      react(),
    ],
    resolve: {
      // The tree carries two React builds (a hoisted one and the pnpm store's). Without this,
      // framer-motion resolves a different copy than the app and every hook call throws.
      dedupe: ["react", "react-dom"],
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: env.API_PROXY_TARGET || `http://127.0.0.1:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
    // `npm run build && npm run preview` should exercise the same API the dev server does.
    preview: {
      proxy: {
        "/api": {
          target: env.API_PROXY_TARGET || `http://127.0.0.1:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
  };
});
