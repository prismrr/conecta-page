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

async function startDevServer({ host = "127.0.0.1", port = 4180 } = {}) {
  const dbFile = join(tmpdir(), `conecta-compliance-${port}-${Date.now()}.db`);
  const processRef = spawn(
    "python3",
    ["scripts/dev_server.py", "--host", host, "--port", String(port), "--db-file", dbFile],
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
