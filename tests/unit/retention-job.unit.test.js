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

describe("retention job", () => {
  test("should discard expired rows and produce report", () => {
    const baseDir = mkdtempSync(join(tmpdir(), "conecta-retention-"));
    const dbFile = join(baseDir, "compliance.db");
    const reportFile = join(baseDir, "report.json");

    try {
      const bootstrap = runPython([
        "-c",
        [
          "import sqlite3",
          `conn=sqlite3.connect(r'${dbFile}')`,
          "conn.executescript('''",
          "CREATE TABLE consent_records (id INTEGER PRIMARY KEY AUTOINCREMENT, recorded_at TEXT NOT NULL, version TEXT NOT NULL, updated_at TEXT, source TEXT, status TEXT NOT NULL, categories_json TEXT NOT NULL);",
          "CREATE TABLE integration_monitor_events (id INTEGER PRIMARY KEY AUTOINCREMENT, recorded_at TEXT NOT NULL, outcome TEXT NOT NULL, signal TEXT NOT NULL, detail TEXT, source_page TEXT);",
          "CREATE TABLE telemetry_events (id INTEGER PRIMARY KEY AUTOINCREMENT, recorded_at TEXT NOT NULL, event_name TEXT NOT NULL, page TEXT, path TEXT, release_id TEXT, environment TEXT, source_channel TEXT, session_id TEXT, outcome TEXT, reason TEXT, payload_json TEXT NOT NULL, forward_status TEXT NOT NULL, forward_error TEXT);",
          "CREATE TABLE observability_alerts (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, alert_type TEXT NOT NULL, severity TEXT NOT NULL, release_id TEXT, message TEXT NOT NULL, details_json TEXT NOT NULL, fingerprint TEXT NOT NULL UNIQUE);",
          "''')",
          "conn.execute(\"INSERT INTO consent_records (recorded_at, version, status, categories_json) VALUES ('2020-01-01T00:00:00Z','v1','granted','{}')\")",
          "conn.execute(\"INSERT INTO consent_records (recorded_at, version, status, categories_json) VALUES ('2099-01-01T00:00:00Z','v1','granted','{}')\")",
          "conn.commit()",
          "conn.close()"
        ].join(";")
      ]);

      expect(bootstrap.status).toBe(0);

      const run = runPython([
        "scripts/retention_job.py",
        "--db-file",
        dbFile,
        "--report-file",
        reportFile
      ]);

      expect(run.status).toBe(0);

      const report = JSON.parse(readFileSync(reportFile, "utf-8"));
      expect(report.status).toBe("ok");
      expect(report.discardedTotal).toBeGreaterThanOrEqual(1);

      const verify = runPython([
        "-c",
        [
          "import sqlite3",
          `conn=sqlite3.connect(r'${dbFile}')`,
          "rows=conn.execute('SELECT COUNT(1) FROM consent_records').fetchone()[0]",
          "print(rows)",
          "conn.close()"
        ].join(";")
      ]);

      expect(verify.status).toBe(0);
      expect(Number(verify.stdout.trim())).toBe(1);
    } finally {
      rmSync(baseDir, { recursive: true, force: true });
    }
  });
});
