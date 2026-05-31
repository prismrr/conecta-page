const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

describe("lgpd privacy data map", () => {
  const inventoryPath = resolve(__dirname, "../../docs/privacy-data-map.json");
  const inventory = JSON.parse(readFileSync(inventoryPath, "utf-8"));

  test("should declare the expected privacy surfaces", () => {
    expect(inventory.version).toBe("2026-05-31");
    expect(inventory.project).toBe("Conecta PrismRR");

    const ids = inventory.surfaces.map((surface) => surface.id);
    expect(ids).toEqual(expect.arrayContaining([
      "consent_preferences_local",
      "consent_records_sqlite",
      "dsar_request_local_store",
      "dsar_requests_sqlite",
      "dsar_export_artifacts",
      "telemetry_events_runtime",
      "integration_monitor_events_sqlite",
      "content_audit_events_sqlite",
      "observability_alerts_sqlite",
      "ci_artifacts_and_logs"
    ]));
  });

  test("should exclude sensitive personal-data categories by default", () => {
    expect(inventory.prohibitedSensitiveCategories).toEqual([
      "cpf",
      "biometric",
      "health",
      "racial_or_ethnic"
    ]);

    for (const surface of inventory.surfaces) {
      expect(surface.containsSensitiveData).toBe(false);
    }
  });

  test("should keep dsar and telemetry payloads minimal", () => {
    const dsar = inventory.surfaces.find((surface) => surface.id === "dsar_request_local_store");
    expect(dsar.fields).not.toEqual(expect.arrayContaining(["contactEmail", "name", "cpf"]));
    expect(dsar.notes.join(" ")).toContain("not persisted in local storage");

    const telemetry = inventory.surfaces.find((surface) => surface.id === "telemetry_events_runtime");
    expect(telemetry.fields).toEqual(expect.arrayContaining([
      "event",
      "timestamp",
      "page",
      "path",
      "release_id",
      "environment",
      "source_channel",
      "session_id",
      "data"
    ]));
    expect(telemetry.notes.join(" ")).toContain("must not include names");
  });

  test("should align retention expectations with current compliance jobs", () => {
    const consent = inventory.surfaces.find((surface) => surface.id === "consent_records_sqlite");
    const integration = inventory.surfaces.find((surface) => surface.id === "integration_monitor_events_sqlite");
    const telemetry = inventory.surfaces.find((surface) => surface.id === "telemetry_events_runtime");
    const alerts = inventory.surfaces.find((surface) => surface.id === "observability_alerts_sqlite");

    expect(consent.retentionDays).toBe(730);
    expect(integration.retentionDays).toBe(365);
    expect(telemetry.retentionDays).toBe(180);
    expect(alerts.retentionDays).toBe(180);
  });
});