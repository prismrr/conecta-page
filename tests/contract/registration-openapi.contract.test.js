const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { startDevServer } = require("../helpers/dev-server.js");

function readOpenApiSpec() {
  const specPath = resolve(__dirname, "../../contracts/openapi/registration-result.v1.0.0.openapi.json");
  return JSON.parse(readFileSync(specPath, "utf-8"));
}

function isDateTime(value) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

function getRegistrationSchema(spec) {
  return spec.components.schemas.RegistrationResult;
}

function getErrorSchema(spec) {
  return spec.components.schemas.ErrorResponse;
}

function validateRegistrationResult(payload, schema) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  for (const key of schema.required || []) {
    if (!(key in payload)) {
      return false;
    }
  }

  if (typeof payload.registrationId !== "string") {
    return false;
  }

  const minLength = schema.properties.registrationId.minLength || 0;
  const maxLength = schema.properties.registrationId.maxLength || Number.MAX_SAFE_INTEGER;
  if (payload.registrationId.length < minLength || payload.registrationId.length > maxLength) {
    return false;
  }

  const allowedStatus = new Set(schema.properties.status.enum || []);
  if (!allowedStatus.has(payload.status)) {
    return false;
  }

  if (typeof payload.updatedAt !== "string" || !isDateTime(payload.updatedAt)) {
    return false;
  }

  if ("detail" in payload && typeof payload.detail !== "string") {
    return false;
  }

  const detailMaxLength = schema.properties.detail && schema.properties.detail.maxLength;
  if (typeof payload.detail === "string" && detailMaxLength && payload.detail.length > detailMaxLength) {
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

  const allowedError = new Set(schema.properties.error.enum || []);
  if (!allowedError.has(payload.error)) {
    return false;
  }

  if (expectedError && payload.error !== expectedError) {
    return false;
  }

  return true;
}

describe("registration openapi contract", () => {
  let server;
  const spec = readOpenApiSpec();
  const registrationSchema = getRegistrationSchema(spec);
  const errorSchema = getErrorSchema(spec);

  beforeAll(async () => {
    server = await startDevServer({ port: 4182 });
  });

  afterAll(async () => {
    await server.stop();
  });

  test("openapi spec should be versioned and include registration path", () => {
    expect(spec.openapi).toBe("3.0.3");
    expect(spec.info.version).toBe("1.0.0");
    expect(spec.info["x-contract-version"]).toBe("1.0.0");
    expect(spec.paths["/api/registrations/{registrationId}"]).toBeDefined();
    expect(registrationSchema).toBeDefined();
    expect(errorSchema).toBeDefined();
  });

  test("provider 200 payload should satisfy OpenAPI schema", async () => {
    const response = await fetch(`${server.baseUrl}/api/registrations/PRISM-2026-001`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(validateRegistrationResult(payload, registrationSchema)).toBe(true);
  });

  test("provider known error payloads should satisfy OpenAPI error schema", async () => {
    const scenarios = [
      { id: "PRISM-2026-404", status: 404, error: "not_found" },
      { id: "PRISM-2026-401", status: 401, error: "unauthorized" },
      { id: "PRISM-2026-503", status: 503, error: "provider_unavailable" }
    ];

    for (const scenario of scenarios) {
      const response = await fetch(`${server.baseUrl}/api/registrations/${scenario.id}`);
      const payload = await response.json();

      expect(response.status).toBe(scenario.status);
      expect(validateErrorResponse(payload, errorSchema, scenario.error)).toBe(true);
    }
  });

  test("contract-invalid payload should be detected against OpenAPI schema", async () => {
    const response = await fetch(`${server.baseUrl}/api/registrations/PRISM-2026-999`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(validateRegistrationResult(payload, registrationSchema)).toBe(false);
  });
});
