const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");

const ROOT_DIR = resolve(__dirname, "..");
const INVENTORY_PATH = resolve(ROOT_DIR, "docs/privacy-data-map.json");
const SERVER_PATH = resolve(ROOT_DIR, "backend/server/dev_server.py");
const DSAR_FORM_PATH = resolve(ROOT_DIR, "nuxt-app/components/legal/DsarRequestForm.vue");
const DSAR_STORE_PATH = resolve(ROOT_DIR, "nuxt-app/stores/dsar.ts");
const TELEMETRY_COMPOSABLE_PATH = resolve(ROOT_DIR, "nuxt-app/composables/useTelemetry.ts");
const RETENTION_JOB_PATH = resolve(ROOT_DIR, "backend/jobs/retention_job.py");
const INCIDENT_DRILL_PATH = resolve(ROOT_DIR, "backend/jobs/incident_drill.py");
const REPORT_DIR = resolve(ROOT_DIR, "logs");
const REPORT_JSON_PATH = resolve(REPORT_DIR, "privacy-data-report.json");
const REPORT_MD_PATH = resolve(REPORT_DIR, "privacy-data-report.md");

const inventory = JSON.parse(readFileSync(INVENTORY_PATH, "utf-8"));
const serverCode = readFileSync(SERVER_PATH, "utf-8");
const dsarForm = readFileSync(DSAR_FORM_PATH, "utf-8");
const dsarStore = readFileSync(DSAR_STORE_PATH, "utf-8");
const telemetryComposable = readFileSync(TELEMETRY_COMPOSABLE_PATH, "utf-8");
const retentionJob = readFileSync(RETENTION_JOB_PATH, "utf-8");
const incidentDrill = readFileSync(INCIDENT_DRILL_PATH, "utf-8");

const expectedSurfaceIds = [
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
];

const expectedRetentionSnippets = [
  '"consent_records": {"column": "recorded_at", "retention_days": 730}',
  '"integration_monitor_events": {"column": "recorded_at", "retention_days": 365}',
  '"telemetry_events": {"column": "recorded_at", "retention_days": 180}',
  '"observability_alerts": {"column": "created_at", "retention_days": 180}'
];

const expectedIncidentSteps = ["detect", "classify", "contain", "notify", "recover"];
const requiredTelemetryFields = [
  "event",
  "timestamp",
  "page",
  "path",
  "release_id",
  "environment",
  "source_channel",
  "session_id",
  "data"
];

const errors = [];

const assert = (condition, message) => {
  if (!condition) {
    errors.push(message);
  }
};

const surfaceSummary = (surface) => ({
  id: surface.id,
  layer: surface.layer,
  artifact: surface.artifact,
  dataCategory: surface.dataCategory,
  legalBasis: surface.legalBasis || [],
  storage: surface.storage || [],
  retentionDays: surface.retentionDays,
  containsSensitiveData: surface.containsSensitiveData === true,
  requiresRedaction: surface.requiresRedaction === true
});

assert(inventory.version === "2026-05-31", "privacy inventory version must stay pinned to 2026-05-31");
assert(inventory.project === "Conecta PrismRR", "privacy inventory project name mismatch");

const surfaceIds = (inventory.surfaces || []).map((surface) => surface.id);
for (const surfaceId of expectedSurfaceIds) {
  assert(surfaceIds.includes(surfaceId), `missing privacy inventory surface: ${surfaceId}`);
}

assert(Array.isArray(inventory.prohibitedSensitiveCategories), "privacy inventory must define prohibitedSensitiveCategories");
assert(
  JSON.stringify(inventory.prohibitedSensitiveCategories) === JSON.stringify(["cpf", "biometric", "health", "racial_or_ethnic"]),
  "privacy inventory prohibited categories mismatch"
);

for (const surface of inventory.surfaces || []) {
  assert(surface.containsSensitiveData === false, `surface ${surface.id} must not be marked as containing sensitive data`);
}

const dsarSurface = inventory.surfaces.find((surface) => surface.id === "dsar_request_local_store");
assert(Boolean(dsarSurface), "missing dsar_request_local_store surface");
assert(!JSON.stringify(dsarSurface.fields).includes("contactEmail"), "DSAR surface must not persist contactEmail");
assert(!JSON.stringify(dsarStore).includes("contactEmail"), "DSAR store source must not persist contactEmail");

const consentSurface = inventory.surfaces.find((surface) => surface.id === "consent_preferences_local");
assert(Boolean(consentSurface), "missing consent_preferences_local surface");
assert(
  JSON.stringify(consentSurface.fields).includes("categories.marketing_optional"),
  "consent surface must include categories.marketing_optional"
);
assert(
  !JSON.stringify(consentSurface.fields).includes("categories.communication_optional"),
  "consent surface must not depend on legacy categories.communication_optional"
);

const consentStoreCode = readFileSync(resolve(ROOT_DIR, "nuxt-app/stores/consent.ts"), "utf-8");
assert(
  consentStoreCode.includes("marketing_optional") && !consentStoreCode.includes("communication_optional: boolean"),
  "consent store must expose marketing_optional as the optional marketing category"
);

assert(serverCode.includes('/compliance/dsar-requests'), "DSAR backend route must be exposed for request submission and operations");
assert(serverCode.includes('secure-delete'), "DSAR backend must support secure deletion of export artifacts");
assert(
  dsarForm.includes("complianceApiBase") && dsarForm.includes("dsar-requests"),
  "DSAR form must submit to the backend DSAR request endpoint"
);

const telemetrySurface = inventory.surfaces.find((surface) => surface.id === "telemetry_events_runtime");
assert(Boolean(telemetrySurface), "missing telemetry_events_runtime surface");
assert(
  JSON.stringify(telemetrySurface.fields) === JSON.stringify(requiredTelemetryFields),
  "telemetry inventory fields mismatch"
);
assert(telemetryComposable.includes("session_id: getSessionId()"), "telemetry composable must continue emitting session_id");
assert(JSON.stringify(telemetryComposable).includes('window.dataLayer = window.dataLayer || [];'), "telemetry composable must keep local dataLayer fallback");
assert(!JSON.stringify(telemetryComposable).includes("cpf"), "telemetry composable must not reference cpf");

const retentionExpectations = [
  '"consent_records": {"column": "recorded_at", "retention_days": 730}',
  '"dsar_requests": {"column": "requested_at", "retention_days": 730}',
  '"integration_monitor_events": {"column": "recorded_at", "retention_days": 365}',
  '"telemetry_events": {"column": "recorded_at", "retention_days": 180}',
  '"observability_alerts": {"column": "created_at", "retention_days": 180}'
];

for (const snippet of retentionExpectations) {
  assert(retentionJob.includes(snippet), `retention policy snippet missing: ${snippet}`);
}

assert(incidentDrill.includes('"external_provider_outage"'), "incident drill scenario id must stay pinned");
for (const stepId of expectedIncidentSteps) {
  assert(incidentDrill.includes(`"id": "${stepId}"`) || incidentDrill.includes(`'id': '${stepId}'`), `incident drill missing step ${stepId}`);
}

assert(
  (inventory.surfaces.find((surface) => surface.id === "ci_artifacts_and_logs") || {}).requiresRedaction === true,
  "CI artifacts inventory entry must require redaction"
);

const report = {
  generatedAt: new Date().toISOString(),
  status: errors.length > 0 ? "fail" : "pass",
  inventoryVersion: inventory.version,
  project: inventory.project,
  prohibitedSensitiveCategories: inventory.prohibitedSensitiveCategories,
  surfaceCount: (inventory.surfaces || []).length,
  surfaces: (inventory.surfaces || []).map(surfaceSummary),
  checks: {
    dsarMinimized: errors.every((message) => !message.includes("DSAR")),
    telemetryScoped: errors.every((message) => !message.includes("telemetry")),
    retentionAligned: errors.every((message) => !message.includes("retention")),
    incidentDrillPinned: errors.every((message) => !message.includes("incident drill")),
    ciArtifactsRedacted: errors.every((message) => !message.includes("CI artifacts"))
  },
  issues: errors
};

mkdirSync(REPORT_DIR, { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf-8");

const markdownLines = [
  "# LGPD Privacy Inventory Report",
  "",
  `- Generated At: ${report.generatedAt}`,
  `- Status: ${report.status.toUpperCase()}`,
  `- Project: ${report.project}`,
  `- Inventory Version: ${report.inventoryVersion}`,
  `- Surfaces: ${report.surfaceCount}`,
  "",
  "## Prohibited Sensitive Categories",
  "",
  ...report.prohibitedSensitiveCategories.map((category) => `- ${category}`),
  "",
  "## Surfaces",
  "",
  "| ID | Layer | Data Category | Retention (days) | Redaction |",
  "|---|---|---|---:|---|",
  ...report.surfaces.map((surface) => `| ${surface.id} | ${surface.layer} | ${surface.dataCategory} | ${surface.retentionDays ?? "n/a"} | ${surface.requiresRedaction ? "yes" : "no"} |`),
  "",
  "## Validation Findings",
  "",
  ...(errors.length > 0 ? errors.map((error) => `- ${error}`) : ["- No blocking issues detected."])
];

writeFileSync(REPORT_MD_PATH, `${markdownLines.join("\n")}\n`, "utf-8");

if (errors.length > 0) {
  for (const error of errors) {
    // eslint-disable-next-line no-console
    console.error(`- ${error}`);
  }
  // eslint-disable-next-line no-console
  console.error(`Privacy inventory report written to ${REPORT_MD_PATH}`);
  process.exit(1);
}

// eslint-disable-next-line no-console
console.log("Privacy inventory gate passed.");
// eslint-disable-next-line no-console
console.log(`Privacy inventory report written to ${REPORT_MD_PATH}`);