import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

/* Tempo build and test configuration.
   Two pages: the marketing landing at / (root index.html) and the
   trainer app at /app/ (app/index.html, which boots the React app). */
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        app: resolve(__dirname, "app/index.html"),
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.js"],
    include: ["tests/**/*.test.{js,jsx}"],
  },
});
