const { spawn, spawnSync } = require("node:child_process");
const { rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(url, processRef, getLogs, maxAttempts = 50) {
  for (let i = 0; i < maxAttempts; i += 1) {
    if (processRef.exitCode !== null) {
      const logs = getLogs();
      throw new Error(`Server exited before becoming healthy (exit=${processRef.exitCode}).\n${logs}`);
    }

    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch (_error) {
      // retry until ready
    }

    await wait(150);
  }

  throw new Error(`Server did not become healthy at ${url}.\n${getLogs()}`);
}

async function startDevServer({
  host = "127.0.0.1",
  port = 4180,
  telemetryForwardUrl = "",
  telemetryForwardProvider = "raw",
  telemetryForwardAuthType = "none",
  telemetryForwardAuthToken = "",
  telemetryForwardAuthHeader = "X-API-Key",
  telemetryForwardUsername = "",
  telemetryForwardPassword = "",
  telemetryForwardTimeoutSeconds = 3,
  alertFailureThreshold = 3,
  alertWindowMinutes = 15
} = {}) {
  const dbFile = join(tmpdir(), `conecta-compliance-${port}-${Date.now()}.db`);
  const exportDir = join(tmpdir(), `conecta-dsar-exports-${port}-${Date.now()}`);
  const args = [
    "backend/fastapi_server.py",
    "--host",
    host,
    "--port",
    String(port)
  ];

  const env = {
    ...process.env,
    CONECTA_COMPLIANCE_DB_FILE: dbFile,
    CONECTA_DSAR_EXPORT_DIR: exportDir,
    TELEMETRY_FORWARD_URL: telemetryForwardUrl,
    TELEMETRY_FORWARD_PROVIDER: telemetryForwardProvider,
    TELEMETRY_FORWARD_AUTH_TYPE: telemetryForwardAuthType,
    TELEMETRY_FORWARD_AUTH_TOKEN: telemetryForwardAuthToken,
    TELEMETRY_FORWARD_AUTH_HEADER: telemetryForwardAuthHeader,
    TELEMETRY_FORWARD_USERNAME: telemetryForwardUsername,
    TELEMETRY_FORWARD_PASSWORD: telemetryForwardPassword,
    TELEMETRY_FORWARD_TIMEOUT_SECONDS: String(telemetryForwardTimeoutSeconds),
    ALERT_FAILURE_THRESHOLD: String(alertFailureThreshold),
    ALERT_WINDOW_MINUTES: String(alertWindowMinutes)
  };

  if (telemetryForwardUrl) {
    env.TELEMETRY_FORWARD_URL = telemetryForwardUrl;
  }

  const processRef = spawn(
    "python3",
    args,
    {
      env,
      stdio: ["ignore", "pipe", "pipe"]
    }
  );

  const stdoutChunks = [];
  const stderrChunks = [];
  processRef.stdout.on("data", (chunk) => {
    stdoutChunks.push(chunk.toString("utf-8"));
  });
  processRef.stderr.on("data", (chunk) => {
    stderrChunks.push(chunk.toString("utf-8"));
  });

  const getLogs = () => {
    const stdout = stdoutChunks.join("").trim();
    const stderr = stderrChunks.join("").trim();
    return [`[stdout] ${stdout || "<empty>"}`, `[stderr] ${stderr || "<empty>"}`].join("\n");
  };

  const healthUrl = `http://${host}:${port}/healthz`;
  await waitForHealth(healthUrl, processRef, getLogs);

  return {
    baseUrl: `http://${host}:${port}`,
    async seedIntermediateData(seedPayload = {}) {
      const encodedPayload = Buffer.from(JSON.stringify(seedPayload), "utf-8").toString("base64");
      const seedScript = `
import base64
import hashlib
import json
import os
import sqlite3
from pathlib import Path

from backend.api.sqlite_utils import init_database, utc_now_iso

db_file = Path(os.environ["CONECTA_COMPLIANCE_DB_FILE"])
init_database(db_file)

raw_payload = base64.b64decode(os.environ.get("CONECTA_SEED_PAYLOAD_B64", "")).decode("utf-8")
payload = json.loads(raw_payload) if raw_payload else {}

conn = sqlite3.connect(str(db_file))

for batch in payload.get("batches", []):
    conn.execute(
        """
        INSERT OR REPLACE INTO ingest_batches (
            lote_importacao,
            origem_url,
            checksum_arquivo,
            tamanho_arquivo_bytes,
            status_lote,
            iniciado_em,
            finalizado_em,
            total_linhas,
            linhas_validas,
            linhas_invalidas,
            registros_inseridos,
            registros_atualizados,
            divergencias_schema_json,
            erro_resumo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            batch.get("loteImportacao"),
            batch.get("origemUrl", "https://example.com/inscricoes.csv"),
            batch.get("checksumArquivo", "seed-checksum"),
            int(batch.get("tamanhoArquivoBytes", 1024)),
            batch.get("statusLote", "concluido"),
            batch.get("iniciadoEm", utc_now_iso()),
            batch.get("finalizadoEm", utc_now_iso()),
            int(batch.get("totalLinhas", 1)),
            int(batch.get("linhasValidas", 1)),
            int(batch.get("linhasInvalidas", 0)),
            int(batch.get("registrosInseridos", 1)),
            int(batch.get("registrosAtualizados", 0)),
            batch.get("divergenciasSchemaJson"),
            batch.get("erroResumo"),
        ),
    )

for inscricao in payload.get("inscricoes", []):
    email = inscricao.get("email", "seed@example.com").strip().lower()
    conn.execute(
        """
        INSERT OR REPLACE INTO inscricoes (
            id,
            nome,
            email_ciphertext,
            email_hash,
            status,
            data_atualizacao_origem,
            source_checksum,
            lote_importacao,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            inscricao.get("id"),
            inscricao.get("nome", "Teste Seed"),
            f"seed::{email}",
            hashlib.sha256(email.encode("utf-8")).hexdigest(),
            inscricao.get("status", "APROVADO"),
            inscricao.get("dataAtualizacaoOrigem", utc_now_iso()),
            inscricao.get("sourceChecksum", "seed-checksum"),
            inscricao.get("loteImportacao", "ING-SEED-0001"),
            inscricao.get("createdAt", utc_now_iso()),
            inscricao.get("updatedAt", utc_now_iso()),
        ),
    )

conn.commit()
conn.close()
      `;

      const seedResult = spawnSync("python3", ["-c", seedScript], {
        env: {
          ...process.env,
          CONECTA_COMPLIANCE_DB_FILE: dbFile,
          CONECTA_SEED_PAYLOAD_B64: encodedPayload
        },
        encoding: "utf-8"
      });

      if (seedResult.status !== 0) {
        throw new Error(
          `Failed to seed intermediate data: ${seedResult.stderr || seedResult.stdout || "unknown error"}`
        );
      }
    },
    async stop() {
      if (!processRef.killed) {
        processRef.kill("SIGTERM");
      }
      await wait(120);
      await rm(dbFile, { force: true });
      await rm(exportDir, { force: true, recursive: true });
    }
  };
}

module.exports = {
  startDevServer
};
