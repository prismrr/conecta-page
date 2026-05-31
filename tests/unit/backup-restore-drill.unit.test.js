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

describe("backup restore drill", () => {
  test("should verify a backup restore roundtrip and produce report", () => {
    const baseDir = mkdtempSync(join(tmpdir(), "conecta-backup-restore-"));
    const dbFile = join(baseDir, "compliance.db");
    const reportFile = join(baseDir, "report.json");
    const summaryFile = join(baseDir, "summary.md");
    const backupFile = join(baseDir, "backup.sqlite");
    const restoredFile = join(baseDir, "restored.sqlite");

    try {
      const bootstrap = runPython([
        "-c",
        [
          "import sqlite3",
          `conn=sqlite3.connect(r'${dbFile}')`,
          "conn.executescript('''",
          "CREATE TABLE consent_records (id INTEGER PRIMARY KEY AUTOINCREMENT, recorded_at TEXT NOT NULL, version TEXT NOT NULL, updated_at TEXT, source TEXT, status TEXT NOT NULL, categories_json TEXT NOT NULL);",
          "CREATE TABLE dsar_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, protocol TEXT NOT NULL UNIQUE, requested_at TEXT NOT NULL, request_type TEXT NOT NULL, requested_by TEXT NOT NULL, source TEXT NOT NULL, status TEXT NOT NULL, response_channel TEXT, export_path TEXT, export_generated_at TEXT, export_deleted_at TEXT, deleted_at TEXT);",
          "''')",
          "conn.execute(\"INSERT INTO consent_records (recorded_at, version, status, categories_json) VALUES ('2020-01-01T00:00:00Z','v1','granted','{}')\")",
          "conn.execute(\"INSERT INTO dsar_requests (protocol, requested_at, request_type, requested_by, source, status) VALUES ('DSAR-2020-0001','2020-01-01T00:00:00Z','access','channel','web','received')\")",
          "conn.commit()",
          "conn.close()"
        ].join(";")
      ]);

      expect(bootstrap.status).toBe(0);

      const run = runPython([
        "backend/jobs/backup_restore_drill.py",
        "--db-file",
        dbFile,
        "--report-file",
        reportFile,
        "--summary-file",
        summaryFile,
        "--backup-file",
        backupFile,
        "--restored-file",
        restoredFile
      ]);

      expect(run.status).toBe(0);

      const report = JSON.parse(readFileSync(reportFile, "utf-8"));
      expect(report.status).toBe("pass");
      expect(report.tablesVerified).toEqual(expect.arrayContaining(["consent_records", "dsar_requests"]));
      expect(report.originalSnapshot).toEqual(report.restoredSnapshot);

      const summary = readFileSync(summaryFile, "utf-8");
      expect(summary).toContain("Compliance Backup and Restore Summary");
      expect(summary).toContain("consent_records");
      expect(summary).toContain("dsar_requests");
    } finally {
      rmSync(baseDir, { recursive: true, force: true });
    }
  });
});