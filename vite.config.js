import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* Tempo build and test configuration. */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.js"],
    include: ["tests/**/*.test.{js,jsx}"],
  },
});
