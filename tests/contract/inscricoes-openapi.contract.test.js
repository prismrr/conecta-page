const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { startDevServer } = require("../helpers/dev-server.js");

function readOpenApiSpec() {
  const specPath = resolve(__dirname, "../../contracts/openapi/inscricoes.v1.0.0.openapi.json");
  return JSON.parse(readFileSync(specPath, "utf-8"));
}

function isDateTime(value) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

function getInscricaoSchema(spec) {
  return spec.components.schemas.InscricaoResponse;
}

function getErrorSchema(spec) {
  return spec.components.schemas.ErrorResponse;
}

function validateInscricaoResponse(payload, schema) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  for (const key of schema.required || []) {
    if (!(key in payload)) {
      return false;
    }
  }

  if (typeof payload.id !== "string") {
    return false;
  }

  const allowedStatus = new Set(schema.properties.status.enum || []);
  if (!allowedStatus.has(payload.status)) {
    return false;
  }

  if (typeof payload.ultimaAtualizacao !== "string" || !isDateTime(payload.ultimaAtualizacao)) {
    return false;
  }

  return true;
}

function validateErrorResponse(payload, schema, expectedError) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  for (const key of schema.required || []) {
    if (!(key in payload)) {
      return false;
    }
  }

  if (payload.ok !== false) {
    return false;
  }

  if (typeof payload.error !== "string") {
    return false;
  }

  if (expectedError && payload.error !== expectedError) {
    return false;
  }

  return true;
}

describe("inscricoes openapi contract", () => {
  let server;
  const spec = readOpenApiSpec();
  const inscricaoSchema = getInscricaoSchema(spec);
  const errorSchema = getErrorSchema(spec);

  beforeAll(async () => {
    server = await startDevServer({ port: 4186 });
    await server.seedIntermediateData({
      batches: [
        {
          loteImportacao: "ING-CONTRACT-20260531-0001",
          checksumArquivo: "contract-checksum-0001",
          statusLote: "concluido",
          totalLinhas: 2,
          linhasValidas: 2,
          linhasInvalidas: 0,
          registrosInseridos: 2,
          registrosAtualizados: 0,
          iniciadoEm: "2026-05-31T09:00:00Z",
          finalizadoEm: "2026-05-31T09:00:04Z"
        }
      ],
      inscricoes: [
        {
          id: "PRISM-2026-001",
          nome: "Pessoa Contrato",
          email: "pessoa.contrato@example.com",
          status: "APROVADO",
          dataAtualizacaoOrigem: "2026-05-24T10:00:00Z",
          loteImportacao: "ING-CONTRACT-20260531-0001",
          sourceChecksum: "contract-checksum-0001"
        }
      ]
    });
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  });

  test("openapi spec should be versioned and include inscricoes path", () => {
    expect(spec.openapi).toBe("3.0.3");
    expect(spec.info.version).toBe("1.0.0");
    expect(spec.info["x-contract-version"]).toBe("1.0.0");
    expect(spec.paths["/api/inscricoes/{id}"]).toBeDefined();
    expect(inscricaoSchema).toBeDefined();
    expect(errorSchema).toBeDefined();
  });

  test("inscricoes 200 payload should satisfy OpenAPI schema", async () => {
    const response = await fetch(`${server.baseUrl}/api/inscricoes/PRISM-2026-001`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(validateInscricaoResponse(payload, inscricaoSchema)).toBe(true);
  });

  test("inscricoes not found payload should satisfy OpenAPI error schema", async () => {
    const response = await fetch(`${server.baseUrl}/api/inscricoes/PRISM-2026-404`);
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(validateErrorResponse(payload, errorSchema, "not_found")).toBe(true);
  });
});
