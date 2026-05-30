import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "node",
    environmentMatchGlobs: [
      ["tests/component/nuxt/**/*.test.js", "jsdom"],
      ["tests/unit/nuxt-dsar-store.test.js", "jsdom"]
    ],
    globals: true,
    include: [
      "tests/unit/**/*.test.js",
      "tests/component/**/*.test.js",
      "tests/integration/**/*.test.js",
      "tests/contract/**/*.test.js"
    ],
    testTimeout: 20000,
    hookTimeout: 20000,
    coverage: {
      enabled: false
    }
  }
});
