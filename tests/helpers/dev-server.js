const { spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const { rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");

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
  const generatedStaticDir = resolve(__dirname, "../../nuxt-app/.output/public");
  const fallbackStaticDir = resolve(__dirname, "../..");
  const staticDir = existsSync(generatedStaticDir) ? generatedStaticDir : fallbackStaticDir;
  const args = [
    "backend/server/dev_server.py",
    "--host",
    host,
    "--port",
    String(port),
    "--static-dir",
    staticDir,
    "--db-file",
    dbFile,
    "--alert-failure-threshold",
    String(alertFailureThreshold),
    "--alert-window-minutes",
    String(alertWindowMinutes)
  ];

  if (telemetryForwardUrl) {
    args.push(
      "--telemetry-forward-url",
      telemetryForwardUrl,
      "--telemetry-forward-provider",
      telemetryForwardProvider,
      "--telemetry-forward-auth-type",
      telemetryForwardAuthType,
      "--telemetry-forward-auth-header",
      telemetryForwardAuthHeader,
      "--telemetry-forward-timeout-seconds",
      String(telemetryForwardTimeoutSeconds)
    );

    if (telemetryForwardAuthToken) {
      args.push("--telemetry-forward-auth-token", telemetryForwardAuthToken);
    }

    if (telemetryForwardUsername) {
      args.push("--telemetry-forward-username", telemetryForwardUsername);
    }

    if (telemetryForwardPassword) {
      args.push("--telemetry-forward-password", telemetryForwardPassword);
    }
  }

  const processRef = spawn(
    "python3",
    args,
    {
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
    }
  };
}

module.exports = {
  startDevServer
};
