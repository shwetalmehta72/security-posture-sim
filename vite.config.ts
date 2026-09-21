import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // Relative base so the built bundle works from any sub-path when hosted.
  base: "./",
  server: { port: 5173, host: true },
  build: { outDir: "dist", sourcemap: false },
});
