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

  test("compliance consent endpoint should persist and list records", async () => {
    const createResponse = await fetch(`${server.baseUrl}/compliance/consent-records`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: "consent-v2-2026-05",
        updatedAt: "2026-05-23T19:00:00Z",
        source: "integration_test",
        status: "granted",
        categories: {
          essential: true,
          analytics_optional: true,
          communication_optional: false
        }
      })
    });

    const createPayload = await createResponse.json();
    expect(createResponse.status).toBe(201);
    expect(createPayload.ok).toBe(true);

    const listResponse = await fetch(`${server.baseUrl}/compliance/consent-records?limit=5`);
    const listPayload = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listPayload.ok).toBe(true);
    expect(Array.isArray(listPayload.records)).toBe(true);
    expect(listPayload.records.length).toBeGreaterThan(0);
    expect(listPayload.records[0].version).toBe("consent-v2-2026-05");
    expect(listPayload.records[0].categories.analytics_optional).toBe(true);
  });

  test("compliance integration summary should aggregate availability and failures", async () => {
    const events = [
      { outcome: "success", signal: "available", detail: "ok" },
      { outcome: "not_found", signal: "available", detail: "missing" },
      { outcome: "contract_error", signal: "degraded", detail: "contract" },
      { outcome: "service_unavailable", signal: "unavailable", detail: "provider" }
    ];

    for (const event of events) {
      const response = await fetch(`${server.baseUrl}/compliance/integration-events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...event,
          sourcePage: "inscricoes"
        })
      });

      expect(response.status).toBe(201);
    }

    const summaryResponse = await fetch(`${server.baseUrl}/compliance/integration-summary`);
    const summaryPayload = await summaryResponse.json();

    expect(summaryResponse.status).toBe(200);
    expect(summaryPayload.ok).toBe(true);
    expect(summaryPayload.summary.totalChecks).toBeGreaterThanOrEqual(4);
    expect(summaryPayload.summary.availableChecks).toBeGreaterThanOrEqual(2);
    expect(summaryPayload.summary.degradedChecks).toBeGreaterThanOrEqual(1);
    expect(summaryPayload.summary.providerFailures).toBeGreaterThanOrEqual(2);
    expect(summaryPayload.summary.lastEvent).not.toBeNull();
  });

  test("content audit endpoint should list seed events", async () => {
    const response = await fetch(`${server.baseUrl}/compliance/content-audit-events?limit=10`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(Array.isArray(payload.events)).toBe(true);
    expect(payload.events.length).toBeGreaterThan(0);
    expect(payload.events[0]).toHaveProperty("eventId");
    expect(payload.events[0]).toHaveProperty("author");
    expect(payload.events[0]).toHaveProperty("version");
  });
});
