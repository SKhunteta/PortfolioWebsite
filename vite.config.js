import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
    css: false,
    // The backend (node --test) and the standalone sub-apps run their own
    // suites; the root gate covers only the SPA (src/) and repo scripts.
    exclude: [
      ...configDefaults.exclude,
      "portfolio-backend/**",
      "ketu-9/**",
      "meow-9/**",
      "link-map/**",
    ],
  },
});
