const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");

const ROOT_DIR = resolve(__dirname, "..");
const REGISTRY_PATH = resolve(ROOT_DIR, "docs/third-party-registry.json");
const REPORT_DIR = resolve(ROOT_DIR, "logs");
const REPORT_JSON_PATH = resolve(REPORT_DIR, "third-party-governance-report.json");
const REPORT_MD_PATH = resolve(REPORT_DIR, "third-party-governance-report.md");

const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf-8"));
const expectedPartyIds = [
  "prism_registration_provider",
  "observability_loki",
  "github_actions_artifacts"
];

const errors = [];

const assert = (condition, message) => {
  if (!condition) {
    errors.push(message);
  }
};

assert(registry.version === "2026-05-31", "third-party registry version must stay pinned to 2026-05-31");
assert(registry.project === "Conecta PrismRR", "third-party registry project name mismatch");
assert(Array.isArray(registry.thirdParties), "third-party registry must define thirdParties");

const thirdPartyIds = registry.thirdParties.map((party) => party.id);
for (const partyId of expectedPartyIds) {
  assert(thirdPartyIds.includes(partyId), `missing third-party registry entry: ${partyId}`);
}

for (const party of registry.thirdParties) {
  assert(Boolean(party.purpose), `third-party ${party.id} must define a purpose`);
  assert(Array.isArray(party.dataCategories) && party.dataCategories.length > 0, `third-party ${party.id} must define data categories`);
  assert(Array.isArray(party.legalBasis) && party.legalBasis.length > 0, `third-party ${party.id} must define a legal basis`);
  assert(Array.isArray(party.contractualSafeguards) && party.contractualSafeguards.includes("dpa"), `third-party ${party.id} must include dpa safeguards`);
  assert(typeof party.retentionDays === "number", `third-party ${party.id} must define retentionDays`);
  assert(party.containsPersonalData === false, `third-party ${party.id} must not be marked as containing personal data`);
}

const report = {
  generatedAt: new Date().toISOString(),
  status: errors.length > 0 ? "fail" : "pass",
  registryVersion: registry.version,
  project: registry.project,
  thirdPartyCount: registry.thirdParties.length,
  thirdParties: registry.thirdParties,
  issues: errors
};

mkdirSync(REPORT_DIR, { recursive: true });
writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf-8");

const markdownLines = [
  "# Third-Party Governance Report",
  "",
  `- Generated At: ${report.generatedAt}`,
  `- Status: ${report.status.toUpperCase()}`,
  `- Project: ${report.project}`,
  `- Registry Version: ${report.registryVersion}`,
  `- Third Parties: ${report.thirdPartyCount}`,
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
  console.error(`Third-party governance report written to ${REPORT_MD_PATH}`);
  process.exit(1);
}

// eslint-disable-next-line no-console
console.log("Third-party governance gate passed.");
// eslint-disable-next-line no-console
console.log(`Third-party governance report written to ${REPORT_MD_PATH}`);