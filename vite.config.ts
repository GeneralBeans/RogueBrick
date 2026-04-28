import { defineConfig } from "vite";

// For GitHub Pages at https://<user>.github.io/<repo>/ set VITE_BASE="/<repo>/"
// (trailing slash required). The deploy workflow sets this automatically.
const base = process.env.VITE_BASE ?? "/";

export default defineConfig({
  base,
  server: {
    port: 5173,
  },
});
