import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// SVN_BASE_PATH sets the URL path the app is served under (e.g. "/forums" when
// ammoncovino.com proxies /forums/* to SVN). Unset = relative paths, served at "/".
const basePath = process.env.SVN_BASE_PATH
  ? `/${process.env.SVN_BASE_PATH.replace(/^\/+|\/+$/g, "")}/`
  : "./";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  base: basePath,
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
