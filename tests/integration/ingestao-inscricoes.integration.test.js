const { createServer } = require("node:http");
const { spawn, spawnSync } = require("node:child_process");
const { rm } = require("node:fs/promises");
const { existsSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const TEST_FERNET_KEY = "YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE=";
const PROJECT_PYTHON = existsSync(join(process.cwd(), ".venv", "bin", "python"))
  ? join(process.cwd(), ".venv", "bin", "python")
  : "python3";
const PYTHON_INGESTION_READY = (() => {
  const probe = spawnSync(
    PROJECT_PYTHON,
    [
      "-c",
      "import cryptography, celery\nimport backend.ingestion.tasks"
    ],
    {
      env: process.env,
      encoding: "utf-8"
    }
  );

  return probe.status === 0;
})();

function runPythonSnippetSync(code, env = {}) {
  const result = spawnSync(PROJECT_PYTHON, ["-c", code], {
    env: {
      ...process.env,
      ...env
    },
    encoding: "utf-8"
  });

  if (result.status !== 0) {
    throw new Error(`Python snippet failed: ${result.stderr || result.stdout || "unknown error"}`);
  }

  return (result.stdout || "").trim();
}

async function runPythonSnippetAsync(code, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(PROJECT_PYTHON, ["-c", code], {
      env: {
        ...process.env,
        ...env
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python snippet failed: ${stderr || stdout || "unknown error"}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

async function runIngestionTask({ dbFile, sourceUrl, forceReprocess = true }) {
  const output = await runPythonSnippetAsync(
    `
import json
import os

from backend.ingestion.tasks import sync_inscricoes_from_csv

payload = {}
try:
  result = sync_inscricoes_from_csv(
    source_url=os.environ["CSV_URL"],
    force_reprocess=os.environ.get("FORCE_REPROCESS", "1") == "1"
  )
  payload = {"ok": True, "result": result}
except Exception as exc:
  payload = {"ok": False, "error": str(exc)}

print(json.dumps(payload, ensure_ascii=True))
    `,
    {
      CONECTA_COMPLIANCE_DB_FILE: dbFile,
      CONECTA_PII_FERNET_KEY: TEST_FERNET_KEY,
      CSV_URL: sourceUrl,
      FORCE_REPROCESS: forceReprocess ? "1" : "0"
    }
  );

  return JSON.parse(output);
}

function readIngestionState(dbFile) {
  const output = runPythonSnippetSync(
    `
import json
import os
import sqlite3

db_path = os.environ["DB_FILE"]
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row

batch = conn.execute(
    """
    SELECT lote_importacao, status_lote, total_linhas, linhas_validas, linhas_invalidas, registros_inseridos, registros_atualizados, erro_resumo
    FROM ingest_batches
    ORDER BY iniciado_em DESC
    LIMIT 1
    """
).fetchone()

errors_count = conn.execute("SELECT COUNT(1) AS total FROM ingest_batch_errors").fetchone()["total"]
inscricoes_count = conn.execute("SELECT COUNT(1) AS total FROM inscricoes").fetchone()["total"]

result = {
  "batch": dict(batch) if batch else None,
  "errorsCount": int(errors_count),
  "inscricoesCount": int(inscricoes_count)
}
print(json.dumps(result, ensure_ascii=True))
conn.close()
    `,
    {
      DB_FILE: dbFile
    }
  );

  return JSON.parse(output);
}

function readBatchHistory(dbFile) {
  const output = runPythonSnippetSync(
    `
import json
import os
import sqlite3

db_path = os.environ["DB_FILE"]
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row

rows = conn.execute(
    """
    SELECT lote_importacao, status_lote, total_linhas, linhas_validas, linhas_invalidas, registros_inseridos, registros_atualizados, erro_resumo
    FROM ingest_batches
    ORDER BY iniciado_em ASC
    """
).fetchall()

print(json.dumps([dict(row) for row in rows], ensure_ascii=True))
conn.close()
    `,
    {
      DB_FILE: dbFile
    }
  );

  return JSON.parse(output);
}

async function startCsvServer(csvContent) {
  const server = createServer((req, res) => {
    if (req.url !== "/inscricoes.csv") {
      res.writeHead(404).end();
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/csv; charset=utf-8"
    });
    res.end(csvContent);
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();

  return {
    url: `http://127.0.0.1:${address.port}/inscricoes.csv`,
    async stop() {
      await new Promise((resolve) => server.close(resolve));
    }
  };
}

const describeIngestion = PYTHON_INGESTION_READY ? describe : describe.skip;

describeIngestion("ingestao de inscricoes (integracao)", () => {
  test("deve ingerir CSV valido e persistir lote concluido", async () => {
    const dbFile = join(tmpdir(), `conecta-ingest-valid-${Date.now()}.db`);
    const csvContent = [
      "id,nome,email,status,data_atualizacao,lote_importacao",
      "PRISM-2026-010,Pessoa Dez,pessoa.dez@example.com,APPROVED,2026-05-24T10:00:00Z,LOTE-EXT-001",
      "PRISM-2026-011,Pessoa Onze,pessoa.onze@example.com,UNDER_REVIEW,2026-05-24T10:10:00Z,LOTE-EXT-001"
    ].join("\n");

    const csvServer = await startCsvServer(csvContent);

    try {
      const execution = await runIngestionTask({
        dbFile,
        sourceUrl: csvServer.url
      });

      expect(execution.ok).toBe(true);
      expect(execution.result.status).toBe("concluido");
      expect(execution.result.metrics.insertedRows).toBe(2);
      expect(execution.result.metrics.invalidRows).toBe(0);

      const state = readIngestionState(dbFile);
      expect(state.batch).toBeTruthy();
      expect(state.batch.status_lote).toBe("concluido");
      expect(state.batch.total_linhas).toBe(2);
      expect(state.batch.linhas_validas).toBe(2);
      expect(state.batch.linhas_invalidas).toBe(0);
      expect(state.errorsCount).toBe(0);
      expect(state.inscricoesCount).toBe(2);
    } finally {
      await csvServer.stop();
      await rm(dbFile, { force: true });
    }
  });

  test("deve falhar ingestao com CSV invalido (schema incompatível)", async () => {
    const dbFile = join(tmpdir(), `conecta-ingest-invalid-${Date.now()}.db`);
    const csvContent = [
      "id,nome,email,status,data_atualizacao",
      "PRISM-2026-099,Pessoa Invalida,pessoa.invalida@example.com,APPROVED,2026-05-24T10:00:00Z"
    ].join("\n");

    const csvServer = await startCsvServer(csvContent);

    try {
      const execution = await runIngestionTask({
        dbFile,
        sourceUrl: csvServer.url
      });

      expect(execution.ok).toBe(false);
      expect(execution.error).toBe("csv_schema_mismatch");

      const state = readIngestionState(dbFile);
      expect(state.batch).toBeNull();
      expect(state.errorsCount).toBe(0);
      expect(state.inscricoesCount).toBe(0);
    } finally {
      await csvServer.stop();
      await rm(dbFile, { force: true });
    }
  });

  test("deve manter idempotencia por checksum ao reprocessar mesmo CSV", async () => {
    const dbFile = join(tmpdir(), `conecta-ingest-idempotencia-${Date.now()}.db`);
    const csvContent = [
      "id,nome,email,status,data_atualizacao,lote_importacao",
      "PRISM-2026-021,Pessoa VinteUm,pessoa.vinteum@example.com,APPROVED,2026-05-24T10:00:00Z,LOTE-EXT-777",
      "PRISM-2026-022,Pessoa VinteDois,pessoa.vintedois@example.com,UNDER_REVIEW,2026-05-24T10:10:00Z,LOTE-EXT-777"
    ].join("\n");

    const csvServer = await startCsvServer(csvContent);

    try {
      const firstRun = await runIngestionTask({
        dbFile,
        sourceUrl: csvServer.url,
        forceReprocess: false
      });

      expect(firstRun.ok).toBe(true);
      expect(firstRun.result.status).toBe("concluido");
      expect(firstRun.result.metrics.insertedRows).toBe(2);

      const secondRun = await runIngestionTask({
        dbFile,
        sourceUrl: csvServer.url,
        forceReprocess: false
      });

      expect(secondRun.ok).toBe(true);
      expect(secondRun.result.status).toBe("duplicado");

      const state = readIngestionState(dbFile);
      expect(state.inscricoesCount).toBe(2);

      const history = readBatchHistory(dbFile);
      expect(history).toHaveLength(2);
      expect(history[0].status_lote).toBe("concluido");
      expect(history[0].registros_inseridos).toBe(2);
      expect(history[1].status_lote).toBe("duplicado");
      expect(history[1].erro_resumo).toBe("checksum_ja_processado");
      expect(history[1].registros_inseridos).toBe(0);
    } finally {
      await csvServer.stop();
      await rm(dbFile, { force: true });
    }
  });
});
