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

function readInscricao(dbFile, inscricaoId) {
  const output = runPythonSnippetSync(
    `
import json
import os
import sqlite3

db_path = os.environ["DB_FILE"]
inscricao_id = os.environ["INSCRICAO_ID"]
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row

row = conn.execute(
    """
    SELECT id, nome, status, data_atualizacao_origem, lote_importacao
    FROM inscricoes
    WHERE id = ?
    LIMIT 1
    """,
    (inscricao_id,)
).fetchone()

print(json.dumps(dict(row) if row else None, ensure_ascii=True))
conn.close()
    `,
    {
      DB_FILE: dbFile,
      INSCRICAO_ID: inscricaoId
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

async function queryInscricaoService({ dbFile, queryType, value }) {
  const output = await runPythonSnippetAsync(
    `
import asyncio
import json
import os

from backend.api.services.inscricoes import (
    IngestBatchNotFoundError,
    InscricaoNotFoundError,
    InscricaoService,
)

async def main():
    service = InscricaoService()
    query_type = os.environ["QUERY_TYPE"]
    value = os.environ["QUERY_VALUE"]

    if query_type == "inscricao":
        try:
            result = await service.get_by_id(value)
            return {"ok": True, "payload": result.model_dump(mode='json', by_alias=True)}
        except InscricaoNotFoundError:
            return {"ok": False, "error": "not_found"}

    if query_type == "lote":
        try:
            result = await service.get_batch_status(value)
            return {"ok": True, "payload": result.model_dump(mode='json', by_alias=True)}
        except IngestBatchNotFoundError:
            return {"ok": False, "error": "batch_not_found"}

    return {"ok": False, "error": "query_type_invalid"}

payload = asyncio.run(main())
print(json.dumps(payload, ensure_ascii=True))
    `,
    {
      CONECTA_COMPLIANCE_DB_FILE: dbFile,
      QUERY_TYPE: queryType,
      QUERY_VALUE: value
    }
  );

  return JSON.parse(output);
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

  test("deve aplicar upsert incremental por data_atualizacao", async () => {
    const dbFile = join(tmpdir(), `conecta-ingest-upsert-${Date.now()}.db`);
    const csvInitial = [
      "id,nome,email,status,data_atualizacao,lote_importacao",
      "PRISM-2026-050,Pessoa Cinquenta,pessoa.cinquenta@example.com,APPROVED,2026-05-24T10:00:00Z,LOTE-EXT-UPSERT-1"
    ].join("\n");
    const csvNewer = [
      "id,nome,email,status,data_atualizacao,lote_importacao",
      "PRISM-2026-050,Pessoa Cinquenta Atualizada,pessoa.cinquenta@example.com,UNDER_REVIEW,2026-05-24T11:00:00Z,LOTE-EXT-UPSERT-2"
    ].join("\n");
    const csvOlder = [
      "id,nome,email,status,data_atualizacao,lote_importacao",
      "PRISM-2026-050,Pessoa Cinquenta Antiga,pessoa.cinquenta@example.com,REJECTED,2026-05-24T09:00:00Z,LOTE-EXT-UPSERT-3"
    ].join("\n");

    const csvServerInitial = await startCsvServer(csvInitial);
    const csvServerNewer = await startCsvServer(csvNewer);
    const csvServerOlder = await startCsvServer(csvOlder);

    try {
      const firstRun = await runIngestionTask({
        dbFile,
        sourceUrl: csvServerInitial.url,
        forceReprocess: true
      });

      expect(firstRun.ok).toBe(true);
      expect(firstRun.result.status).toBe("concluido");
      expect(firstRun.result.metrics.insertedRows).toBe(1);
      expect(firstRun.result.metrics.updatedRows).toBe(0);

      const secondRun = await runIngestionTask({
        dbFile,
        sourceUrl: csvServerNewer.url,
        forceReprocess: true
      });

      expect(secondRun.ok).toBe(true);
      expect(secondRun.result.status).toBe("concluido");
      expect(secondRun.result.metrics.insertedRows).toBe(0);
      expect(secondRun.result.metrics.updatedRows).toBe(1);

      const updatedRecord = readInscricao(dbFile, "PRISM-2026-050");
      expect(updatedRecord).toBeTruthy();
      expect(updatedRecord.nome).toBe("Pessoa Cinquenta Atualizada");
      expect(updatedRecord.status).toBe("EM_ANALISE");
      expect(updatedRecord.data_atualizacao_origem).toBe("2026-05-24T11:00:00+00:00");

      const thirdRun = await runIngestionTask({
        dbFile,
        sourceUrl: csvServerOlder.url,
        forceReprocess: true
      });

      expect(thirdRun.ok).toBe(true);
      expect(thirdRun.result.status).toBe("concluido");
      expect(thirdRun.result.metrics.insertedRows).toBe(0);
      expect(thirdRun.result.metrics.updatedRows).toBe(0);

      const preservedRecord = readInscricao(dbFile, "PRISM-2026-050");
      expect(preservedRecord).toBeTruthy();
      expect(preservedRecord.nome).toBe("Pessoa Cinquenta Atualizada");
      expect(preservedRecord.status).toBe("EM_ANALISE");
      expect(preservedRecord.data_atualizacao_origem).toBe("2026-05-24T11:00:00+00:00");

      const state = readIngestionState(dbFile);
      expect(state.inscricoesCount).toBe(1);
    } finally {
      await csvServerInitial.stop();
      await csvServerNewer.stop();
      await csvServerOlder.stop();
      await rm(dbFile, { force: true });
    }
  });

  test("deve consultar inscricao ingerida no servico de inscricoes", async () => {
    const dbFile = join(tmpdir(), `conecta-ingest-consulta-inscricao-${Date.now()}.db`);
    const csvContent = [
      "id,nome,email,status,data_atualizacao,lote_importacao",
      "PRISM-2026-070,Pessoa Setenta,pessoa.setenta@example.com,REJECTED,2026-05-24T14:00:00Z,LOTE-EXT-CONS-1"
    ].join("\n");

    const csvServer = await startCsvServer(csvContent);
    try {
      const execution = await runIngestionTask({
        dbFile,
        sourceUrl: csvServer.url,
        forceReprocess: true
      });

      expect(execution.ok).toBe(true);
      const response = await queryInscricaoService({
        dbFile,
        queryType: "inscricao",
        value: "PRISM-2026-070"
      });

      expect(response.ok).toBe(true);
      const payload = response.payload;
      expect(payload.id).toBe("PRISM-2026-070");
      expect(payload.status).toBe("REPROVADO");
      expect(payload.ultimaAtualizacao).toContain("2026-05-24T14:00:00");
    } finally {
      await csvServer.stop();
      await rm(dbFile, { force: true });
    }
  });

  test("deve consultar lote ingerido no servico de inscricoes", async () => {
    const dbFile = join(tmpdir(), `conecta-ingest-consulta-lote-${Date.now()}.db`);
    const csvContent = [
      "id,nome,email,status,data_atualizacao,lote_importacao",
      "PRISM-2026-080,Pessoa Oitenta,pessoa.oitenta@example.com,APPROVED,2026-05-24T15:00:00Z,LOTE-EXT-CONS-2",
      "PRISM-2026-081,Pessoa OitentaUm,pessoa.oitentaum@example.com,UNDER_REVIEW,2026-05-24T15:10:00Z,LOTE-EXT-CONS-2"
    ].join("\n");

    const csvServer = await startCsvServer(csvContent);
    try {
      const execution = await runIngestionTask({
        dbFile,
        sourceUrl: csvServer.url,
        forceReprocess: true
      });

      expect(execution.ok).toBe(true);
      expect(execution.result.status).toBe("concluido");
      const response = await queryInscricaoService({
        dbFile,
        queryType: "lote",
        value: execution.result.batchId
      });

      expect(response.ok).toBe(true);
      const payload = response.payload;
      expect(payload.loteImportacao).toBe(execution.result.batchId);
      expect(payload.statusLote).toBe("concluido");
      expect(payload.totalLinhas).toBe(2);
      expect(payload.linhasValidas).toBe(2);
      expect(payload.linhasInvalidas).toBe(0);
      expect(payload.registrosInseridos).toBe(2);
      expect(payload.registrosAtualizados).toBe(0);
      expect(typeof payload.checksumArquivo).toBe("string");
    } finally {
      await csvServer.stop();
      await rm(dbFile, { force: true });
    }
  });
});
