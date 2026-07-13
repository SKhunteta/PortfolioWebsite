import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Production builds are served at builtbyshrey.com/link-map/ (copied into the
// portfolio's Pages artifact by .github/workflows/deploy.yml); dev stays at /.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "/link-map/" : "/",
  server: { host: true },
}));
