const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "tests/e2e",
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure"
  },
  webServer: {
    command: "python3 scripts/dev_server.py --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173/healthz",
    reuseExistingServer: true,
    timeout: 30000
  }
});
