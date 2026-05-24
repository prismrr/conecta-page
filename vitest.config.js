import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
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
