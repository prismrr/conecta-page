const { spawn } = require("node:child_process");
const { resolve } = require("node:path");
const { startDevServer } = require("../helpers/dev-server.js");

function wait(ms) {
  return new Promise((resolveWait) => setTimeout(resolveWait, ms));
}

async function waitForProxyReady(url, maxAttempts = 240) {
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      await fetch(url);
      return;
    } catch (_error) {
      // retry until proxy is ready
    }

    await wait(150);
  }

  throw new Error(`Prism proxy did not become ready at ${url}`);
}

function startPrismProxy({ specPath, upstreamUrl, port }) {
  const args = [
    "--yes",
    "@stoplight/prism-cli",
    "proxy",
    specPath,
    upstreamUrl,
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--errors",
    "true",
    "--verboseLevel",
    "error"
  ];

  const processRef = spawn("npx", args, {
    stdio: ["ignore", "pipe", "pipe"]
  });

  processRef.stdout.on("data", () => {});
  processRef.stderr.on("data", () => {});

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    processRef,
    async stop() {
      if (!processRef.killed) {
        processRef.kill("SIGTERM");
      }
      await wait(120);
    }
  };
}

describe("registration provider verification via Prism proxy", () => {
  let provider;
  let proxy;

  beforeAll(async () => {
    provider = await startDevServer({ port: 4183 });

    const specPath = resolve(__dirname, "../../contracts/openapi/registration-result.v1.0.0.openapi.json");
    proxy = startPrismProxy({
      specPath,
      upstreamUrl: provider.baseUrl,
      port: 4184
    });

    await waitForProxyReady(`${proxy.baseUrl}/api/registrations/PRISM-2026-001`);
  }, 60000);

  afterAll(async () => {
    if (proxy) {
      await proxy.stop();
    }
    if (provider) {
      await provider.stop();
    }
  });

  test("proxy should accept provider response that matches contract", async () => {
    const response = await fetch(`${proxy.baseUrl}/api/registrations/PRISM-2026-001`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.registrationId).toBe("PRISM-2026-001");
    expect(payload.status).toBe("APPROVED");
  });

  test("proxy should keep known provider error shape/status compatible with contract", async () => {
    const response = await fetch(`${proxy.baseUrl}/api/registrations/PRISM-2026-404`);
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.ok).toBe(false);
    expect(payload.error).toBe("not_found");
  });

  test("proxy should reject provider response that violates contract", async () => {
    const response = await fetch(`${proxy.baseUrl}/api/registrations/PRISM-2026-999`);
    const body = await response.json();

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(body.type).toContain("VIOLATIONS");
    expect(Array.isArray(body.validation)).toBe(true);
    expect(body.validation.length).toBeGreaterThan(0);
  });
});
