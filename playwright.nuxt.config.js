const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "tests/e2e/nuxt",
  timeout: 30000,
  retries: 1,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4174",
    trace: "retain-on-failure"
  },
  webServer: {
    command: "npm run nuxt:dev -- --host 127.0.0.1 -p 4174",
    url: "http://127.0.0.1:4174/inscricoes",
    reuseExistingServer: true,
    timeout: 120000
  }
});
