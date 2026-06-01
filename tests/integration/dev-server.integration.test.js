const { startDevServer } = require("../helpers/dev-server.js");
const { createServer } = require("node:http");

describe("dev server integration", () => {
  let server;

  beforeAll(async () => {
    server = await startDevServer({
      port: 4181,
      alertFailureThreshold: 2,
      alertWindowMinutes: 60
    });

    await server.seedIntermediateData({
      batches: [
        {
          loteImportacao: "ING-TEST-20260531-0001",
          checksumArquivo: "seed-checksum-0001",
          statusLote: "concluido",
          totalLinhas: 3,
          linhasValidas: 3,
          linhasInvalidas: 0,
          registrosInseridos: 2,
          registrosAtualizados: 1,
          iniciadoEm: "2026-05-31T10:00:00Z",
          finalizadoEm: "2026-05-31T10:00:05Z"
        }
      ],
      inscricoes: [
        {
          id: "PRISM-2026-001",
          nome: "Pessoa Teste",
          email: "pessoa.teste@example.com",
          status: "APROVADO",
          dataAtualizacaoOrigem: "2026-05-24T10:00:00Z",
          loteImportacao: "ING-TEST-20260531-0001",
          sourceChecksum: "seed-checksum-0001"
        }
      ]
    });
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

  test("inscricoes endpoint should return normalized payload from intermediate store", async () => {
    const response = await fetch(`${server.baseUrl}/api/inscricoes/PRISM-2026-001`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.id).toBe("PRISM-2026-001");
    expect(payload.status).toBe("APROVADO");
    expect(typeof payload.ultimaAtualizacao).toBe("string");
  });

  test("inscricoes endpoint should return not_found for unknown id", async () => {
    const response = await fetch(`${server.baseUrl}/api/inscricoes/PRISM-2026-404`);
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.ok).toBe(false);
    expect(payload.error).toBe("not_found");
  });

  test("inscricoes batch endpoint should expose ingestion metrics", async () => {
    const response = await fetch(`${server.baseUrl}/api/inscricoes/lotes/ING-TEST-20260531-0001`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.loteImportacao).toBe("ING-TEST-20260531-0001");
    expect(payload.statusLote).toBe("concluido");
    expect(payload.totalLinhas).toBe(3);
    expect(payload.registrosInseridos).toBe(2);
    expect(payload.registrosAtualizados).toBe(1);
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
    expect(payload.forwardStatus).toBe("not_configured");
  });

  test("telemetry endpoint should reject invalid contract payload", async () => {
    const response = await fetch(`${server.baseUrl}/telemetry/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        event: "invalid_telemetry",
        timestamp: "not-a-date",
        page: "integration",
        path: "/",
        release_id: "test",
        environment: "test",
        source_channel: "integration",
        session_id: "session",
        data: "invalid"
      })
    });

    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error).toBe("missing_or_invalid_data");
  });

  test("telemetry endpoint should forward to configured destination with api key auth", async () => {
    const received = [];
    const sinkServer = createServer((req, res) => {
      if (req.method !== "POST" || req.url !== "/ingest") {
        res.writeHead(404).end();
        return;
      }

      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf-8");
        received.push({
          apiKey: req.headers["x-api-key"],
          body: JSON.parse(body)
        });
        res.writeHead(202, { "Content-Type": "application/json" });
        res.end('{"ok":true}');
      });
    });

    await new Promise((resolve) => sinkServer.listen(4199, "127.0.0.1", resolve));

    const forwardServer = await startDevServer({
      port: 4182,
      telemetryForwardUrl: "http://127.0.0.1:4199/ingest",
      telemetryForwardProvider: "raw",
      telemetryForwardAuthType: "x-api-key",
      telemetryForwardAuthToken: "test-forward-key"
    });

    try {
      const response = await fetch(`${forwardServer.baseUrl}/telemetry/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          event: "forward_test_event",
          timestamp: "2026-05-23T21:00:00Z",
          page: "integration",
          path: "/",
          release_id: "mvp-forward-test",
          environment: "test",
          source_channel: "integration",
          session_id: "forward-session",
          data: { ok: true }
        })
      });

      const payload = await response.json();
      expect(response.status).toBe(202);
      expect(payload.forwardStatus).toBe("forwarded");
      expect(received.length).toBe(1);
      expect(received[0].apiKey).toBe("test-forward-key");
      expect(received[0].body.event).toBe("forward_test_event");

      const healthResponse = await fetch(`${forwardServer.baseUrl}/observability/health`);
      const healthPayload = await healthResponse.json();
      expect(healthResponse.status).toBe(200);
      expect(healthPayload.health.forwarding.configured).toBe(true);
      expect(healthPayload.health.forwarding.provider).toBe("raw");
      expect(healthPayload.health.forwarding.authType).toBe("x-api-key");
    } finally {
      await forwardServer.stop();
      await new Promise((resolve) => sinkServer.close(resolve));
    }
  });

  test("observability summary should correlate events by release", async () => {
    const events = [
      {
        event: "page_view",
        release_id: "mvp-0.3.0",
        data: {}
      },
      {
        event: "external_data_sync_failed",
        release_id: "mvp-0.3.0",
        data: {
          reason: "provider_unavailable",
          outcome: "service_unavailable"
        }
      },
      {
        event: "page_view",
        release_id: "mvp-0.2.0",
        data: {}
      }
    ];

    for (const telemetryEvent of events) {
      const response = await fetch(`${server.baseUrl}/telemetry/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          event: telemetryEvent.event,
          timestamp: "2026-05-23T20:00:00Z",
          page: "integration",
          path: "/",
          release_id: telemetryEvent.release_id,
          environment: "test",
          source_channel: "integration",
          session_id: "release-correlation",
          data: telemetryEvent.data
        })
      });

      expect(response.status).toBe(202);
    }

    const summaryResponse = await fetch(`${server.baseUrl}/observability/summary?windowMinutes=180`);
    const summaryPayload = await summaryResponse.json();

    expect(summaryResponse.status).toBe(200);
    expect(summaryPayload.ok).toBe(true);
    expect(summaryPayload.summary.totalEvents).toBeGreaterThanOrEqual(3);
    expect(Array.isArray(summaryPayload.summary.byRelease)).toBe(true);

    const releaseCurrent = summaryPayload.summary.byRelease.find((item) => item.releaseId === "mvp-0.3.0");
    expect(releaseCurrent).toBeDefined();
    expect(releaseCurrent.syncFailures).toBeGreaterThanOrEqual(1);
  });

  test("observability alerts should trigger on repeated sync failures", async () => {
    const failureEvent = {
      event: "external_data_sync_failed",
      timestamp: "2026-05-23T20:05:00Z",
      page: "inscricoes",
      path: "/inscricoes",
      release_id: "mvp-alert-test",
      environment: "test",
      source_channel: "integration",
      session_id: "alert-test-session",
      data: {
        reason: "contract_validation_failed",
        outcome: "contract_error"
      }
    };

    const first = await fetch(`${server.baseUrl}/telemetry/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(failureEvent)
    });
    const second = await fetch(`${server.baseUrl}/telemetry/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(failureEvent)
    });

    expect(first.status).toBe(202);
    expect(second.status).toBe(202);

    const alertsResponse = await fetch(`${server.baseUrl}/observability/alerts?limit=20`);
    const alertsPayload = await alertsResponse.json();

    expect(alertsResponse.status).toBe(200);
    expect(alertsPayload.ok).toBe(true);
    expect(Array.isArray(alertsPayload.alerts)).toBe(true);

    const failureAlert = alertsPayload.alerts.find(
      (alert) => alert.alertType === "external_data_sync_failed_spike" && alert.releaseId === "mvp-alert-test"
    );
    expect(failureAlert).toBeDefined();
    expect(failureAlert.severity).toBe("high");
  });

  test("observability health should expose db, forwarding and recency metadata", async () => {
    const response = await fetch(`${server.baseUrl}/observability/health`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.health.status).toBe("ok");
    expect(payload.health.database.ok).toBe(true);
    expect(payload.health.forwarding.configured).toBe(false);
    expect(typeof payload.health.telemetry.countLast24h).toBe("number");
    expect(typeof payload.health.alerts.countLast24h).toBe("number");
    expect(payload.health.alerts.rule.failureThreshold).toBe(2);
    expect(payload.health.alerts.rule.windowMinutes).toBe(60);
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
          marketing_optional: false
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

  test("compliance consent endpoint should reject invalid status", async () => {
    const response = await fetch(`${server.baseUrl}/compliance/consent-records`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: "consent-v2-2026-05",
        status: "pending",
        categories: {
          essential: true,
          analytics_optional: false,
          marketing_optional: false
        }
      })
    });

    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error).toBe("invalid_status");
  });

  test("dsar workflow should register, export and securely delete requests", async () => {
    const createResponse = await fetch(`${server.baseUrl}/compliance/dsar-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        requestType: "exportacao",
        details: "Solicito exportacao dos dados disponiveis.",
        source: "integration_test"
      })
    });

    const createPayload = await createResponse.json();
    expect(createResponse.status).toBe(201);
    expect(createPayload.ok).toBe(true);
    expect(createPayload.protocol).toMatch(/^DSAR-\d{8}-[A-Z0-9]{6}$/);

    const listResponse = await fetch(`${server.baseUrl}/compliance/dsar-requests?limit=5`);
    const listPayload = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listPayload.ok).toBe(true);
    expect(Array.isArray(listPayload.requests)).toBe(true);
    expect(listPayload.requests[0].protocol).toBe(createPayload.protocol);
    expect(listPayload.requests[0].status).toBe("received");
    expect(listPayload.requests[0].detailsHash).toMatch(/^[a-f0-9]{64}$/);

    const exportResponse = await fetch(`${server.baseUrl}/compliance/dsar-requests/${createPayload.protocol}/export`, {
      method: "POST"
    });
    const exportPayload = await exportResponse.json();

    expect(exportResponse.status).toBe(200);
    expect(exportPayload.ok).toBe(true);
    expect(exportPayload.status).toBe("exported");
    expect(exportPayload.exportPath).toContain("logs/dsar-exports/");
    expect(exportPayload.bundle).toBeDefined();
    expect(exportPayload.bundle.consentRecords).toBeDefined();

    const deleteResponse = await fetch(`${server.baseUrl}/compliance/dsar-requests/${createPayload.protocol}/secure-delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        reason: "fulfilled_request"
      })
    });
    const deletePayload = await deleteResponse.json();

    expect(deleteResponse.status).toBe(200);
    expect(deletePayload.ok).toBe(true);
    expect(deletePayload.status).toBe("deleted");
    expect(deletePayload.deletedExport).toBe(true);

    const finalListResponse = await fetch(`${server.baseUrl}/compliance/dsar-requests?limit=5`);
    const finalListPayload = await finalListResponse.json();

    expect(finalListResponse.status).toBe(200);
    expect(finalListPayload.ok).toBe(true);
    expect(finalListPayload.requests[0].status).toBe("deleted");
    expect(finalListPayload.requests[0].deletedAt).toBeTruthy();
    expect(finalListPayload.requests[0].exportPath).toBeNull();
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
