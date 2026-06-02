const { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const { join, resolve } = require("node:path");
const { tmpdir } = require("node:os");

const ROOT_DIR = resolve(__dirname, "../..");

function runNode(args, env = {}) {
  return spawnSync("node", args, {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      ...env
    },
    encoding: "utf-8"
  });
}

describe("inventory governance integration", () => {
  test("should update privacy inventory report from updated privacy-data-map.json", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "conecta-privacy-inventory-"));

    try {
      const sourcePath = resolve(ROOT_DIR, "docs/privacy-data-map.json");
      const inventoryPath = join(tempDir, "privacy-data-map.updated.json");
      const reportJsonPath = join(tempDir, "privacy-data-report.json");
      const reportMdPath = join(tempDir, "privacy-data-report.md");

      const inventory = JSON.parse(readFileSync(sourcePath, "utf-8"));
      inventory.surfaces.push({
        id: "integration_surface_temp",
        layer: "integration_test",
        artifact: "tests/integration/inventory-governance.integration.test.js",
        dataCategory: "telemetry_metadata",
        legalBasis: ["legitimate_interest"],
        storage: ["temporary_json"],
        retentionDays: 30,
        containsSensitiveData: false,
        requiresRedaction: false,
        fields: ["event", "timestamp"],
        notes: ["Temporary integration-only surface to validate inventory update flow."]
      });

      writeFileSync(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf-8");

      const run = runNode(["scripts/privacy_inventory_check.js"], {
        CONECTA_PRIVACY_INVENTORY_PATH: inventoryPath,
        CONECTA_PRIVACY_REPORT_JSON_PATH: reportJsonPath,
        CONECTA_PRIVACY_REPORT_MD_PATH: reportMdPath,
        CONECTA_PRIVACY_REPORT_DIR: tempDir
      });

      expect([0, 1]).toContain(run.status);
      expect(existsSync(reportJsonPath)).toBe(true);
      expect(existsSync(reportMdPath)).toBe(true);

      const report = JSON.parse(readFileSync(reportJsonPath, "utf-8"));
      expect(["pass", "fail"]).toContain(report.status);
      expect(report.inventoryVersion).toBe("2026-05-31");
      expect(report.surfaceCount).toBe(inventory.surfaces.length);
      expect(report.surfaces.map((surface) => surface.id)).toContain("integration_surface_temp");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("should update third-party governance report from updated third-party-registry.json", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "conecta-third-party-registry-"));

    try {
      const sourcePath = resolve(ROOT_DIR, "docs/third-party-registry.json");
      const registryPath = join(tempDir, "third-party-registry.updated.json");
      const reportJsonPath = join(tempDir, "third-party-governance-report.json");
      const reportMdPath = join(tempDir, "third-party-governance-report.md");

      const registry = JSON.parse(readFileSync(sourcePath, "utf-8"));
      registry.thirdParties.push({
        id: "integration_vendor_temp",
        name: "Integration Vendor Temp",
        purpose: "Validate third-party registry update flow in integration tests.",
        dataCategories: ["telemetry_metadata"],
        legalBasis: ["legitimate_interest"],
        contractualSafeguards: ["dpa", "scc"],
        retentionDays: 30,
        containsPersonalData: false,
        notes: ["Temporary integration-only entry for governance report validation."]
      });

      writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf-8");

      const run = runNode(["scripts/third_party_inventory_check.js"], {
        CONECTA_THIRD_PARTY_REGISTRY_PATH: registryPath,
        CONECTA_THIRD_PARTY_REPORT_JSON_PATH: reportJsonPath,
        CONECTA_THIRD_PARTY_REPORT_MD_PATH: reportMdPath,
        CONECTA_THIRD_PARTY_REPORT_DIR: tempDir
      });

      expect(run.status).toBe(0);
      expect(existsSync(reportJsonPath)).toBe(true);
      expect(existsSync(reportMdPath)).toBe(true);

      const report = JSON.parse(readFileSync(reportJsonPath, "utf-8"));
      expect(report.status).toBe("pass");
      expect(report.registryVersion).toBe("2026-05-31");
      expect(report.thirdPartyCount).toBe(registry.thirdParties.length);
      expect(report.thirdParties.map((party) => party.id)).toContain("integration_vendor_temp");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
