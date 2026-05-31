const { spawn } = require("node:child_process");
const { rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(url, maxAttempts = 50) {
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch (_error) {
      // retry until ready
    }

    await wait(150);
  }

  throw new Error(`Server did not become healthy at ${url}`);
}

async function startDevServer({
  host = "127.0.0.1",
  port = 4180,
  telemetryForwardUrl = "",
  telemetryForwardProvider = "raw",
  telemetryForwardAuthType = "none",
  telemetryForwardAuthToken = "",
  telemetryForwardAuthHeader = "X-API-Key",
  telemetryForwardUsername = "",
  telemetryForwardPassword = "",
  telemetryForwardTimeoutSeconds = 3,
  alertFailureThreshold = 3,
  alertWindowMinutes = 15
} = {}) {
  const dbFile = join(tmpdir(), `conecta-compliance-${port}-${Date.now()}.db`);
  const exportDir = join(tmpdir(), `conecta-dsar-exports-${port}-${Date.now()}`);
  const args = [
    "backend/fastapi_server.py",
    "--host",
    host,
    "--port",
    String(port)
  ];

  const env = {
    ...process.env,
    CONECTA_COMPLIANCE_DB_FILE: dbFile,
    CONECTA_DSAR_EXPORT_DIR: exportDir,
    TELEMETRY_FORWARD_URL: telemetryForwardUrl,
    TELEMETRY_FORWARD_PROVIDER: telemetryForwardProvider,
    TELEMETRY_FORWARD_AUTH_TYPE: telemetryForwardAuthType,
    TELEMETRY_FORWARD_AUTH_TOKEN: telemetryForwardAuthToken,
    TELEMETRY_FORWARD_AUTH_HEADER: telemetryForwardAuthHeader,
    TELEMETRY_FORWARD_USERNAME: telemetryForwardUsername,
    TELEMETRY_FORWARD_PASSWORD: telemetryForwardPassword,
    TELEMETRY_FORWARD_TIMEOUT_SECONDS: String(telemetryForwardTimeoutSeconds),
    ALERT_FAILURE_THRESHOLD: String(alertFailureThreshold),
    ALERT_WINDOW_MINUTES: String(alertWindowMinutes)
  };

  if (telemetryForwardUrl) {
    env.TELEMETRY_FORWARD_URL = telemetryForwardUrl;
  }

  const processRef = spawn(
    "python3",
    args,
    {
      env,
      stdio: ["ignore", "pipe", "pipe"]
    }
  );

  processRef.stdout.on("data", () => {});
  processRef.stderr.on("data", () => {});

  const healthUrl = `http://${host}:${port}/healthz`;
  await waitForHealth(healthUrl);

  return {
    baseUrl: `http://${host}:${port}`,
    async stop() {
      if (!processRef.killed) {
        processRef.kill("SIGTERM");
      }
      await wait(120);
      await rm(dbFile, { force: true });
      await rm(exportDir, { force: true, recursive: true });
    }
  };
}

module.exports = {
  startDevServer
};
