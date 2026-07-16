/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Production builds are served at builtbyshrey.com/sound-and-rail/ (copied
// into the portfolio's Pages artifact by .github/workflows/deploy.yml); dev
// stays at /. The old /floating-world/ path still resolves via a redirect
// stub the deploy workflow writes.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "/sound-and-rail/" : "/",
  server: { host: true },
  // Constraint tests only (src/fx/__tests__) — postprocessing effects are
  // GL-free until initialize(renderer), so plain node suffices.
  test: { environment: "node" },
}));
