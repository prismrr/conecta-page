const { startDevServer } = require("../helpers/dev-server.js");

describe("dev server integration", () => {
  let server;

  beforeAll(async () => {
    server = await startDevServer({ port: 4181 });
  });

  afterAll(async () => {
    await server.stop();
  });

  test("health endpoint should return ok", async () => {
    const response = await fetch(`${server.baseUrl}/healthz`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
  });

  test("registration endpoint should return approved payload", async () => {
    const response = await fetch(`${server.baseUrl}/api/registrations/PRISM-2026-001`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.registrationId).toBe("PRISM-2026-001");
    expect(payload.status).toBe("APPROVED");
    expect(typeof payload.updatedAt).toBe("string");
  });

  test("registration endpoint should return contract-invalid payload for 999", async () => {
    const response = await fetch(`${server.baseUrl}/api/registrations/PRISM-2026-999`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("UNKNOWN");
    expect(payload.updatedAt).toBeUndefined();
  });

  test("telemetry endpoint should accept event", async () => {
    const response = await fetch(`${server.baseUrl}/telemetry/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        event: "integration_test_event",
        timestamp: "2026-05-22T00:00:00Z",
        page: "integration",
        path: "/",
        release_id: "test",
        environment: "test",
        source_channel: "integration",
        session_id: "test-session",
        data: { ok: true }
      })
    });

    const payload = await response.json();
    expect(response.status).toBe(202);
    expect(payload.ok).toBe(true);
  });
});
