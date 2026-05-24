const { mkdtempSync, readFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { spawnSync } = require("node:child_process");

function runPython(args) {
  return spawnSync("python3", args, {
    cwd: resolve(__dirname, "../.."),
    encoding: "utf-8"
  });
}

describe("incident drill playbook", () => {
  test("should run simulation and produce pass report with evidence steps", () => {
    const baseDir = mkdtempSync(join(tmpdir(), "conecta-incident-drill-"));
    const dbFile = join(baseDir, "compliance.db");
    const reportFile = join(baseDir, "incident-report.json");
    const summaryFile = join(baseDir, "incident-summary.md");

    try {
      const run = runPython([
        "scripts/incident_drill.py",
        "--db-file",
        dbFile,
        "--report-file",
        reportFile,
        "--summary-file",
        summaryFile
      ]);

      expect(run.status).toBe(0);

      const report = JSON.parse(readFileSync(reportFile, "utf-8"));
      expect(report.status).toBe("pass");
      expect(report.scenarioId).toBe("external_provider_outage");
      expect(Array.isArray(report.steps)).toBe(true);
      expect(report.steps.length).toBeGreaterThanOrEqual(5);
      expect(report.steps.every((step) => step.status === "pass")).toBe(true);

      const summary = readFileSync(summaryFile, "utf-8");
      expect(summary).toContain("Compliance Incident Drill Summary");
      expect(summary).toContain("Step Results");
      expect(summary).toContain("Next Action");
    } finally {
      rmSync(baseDir, { recursive: true, force: true });
    }
  });
});
