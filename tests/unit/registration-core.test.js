const core = require("../../assets/js/registration-core.js");

describe("registration-core unit tests", () => {
  test("buildRegistrationUrl should compose URL with base and template", () => {
    const url = core.buildRegistrationUrl(
      {
        baseUrl: "https://api.example.com/",
        endpointTemplate: "/api/registrations/{registrationId}"
      },
      "PRISM-2026-001"
    );

    expect(url).toBe("https://api.example.com/api/registrations/PRISM-2026-001");
  });

  test("validateRegistrationPayload should accept valid payload", () => {
    const result = core.validateRegistrationPayload(
      {
        registrationId: "PRISM-2026-001",
        status: "APPROVED",
        updatedAt: "2026-05-22T10:00:00Z",
        detail: "Classificado"
      },
      "PRISM-2026-001"
    );

    expect(result).toEqual({ ok: true });
  });

  test("validateRegistrationPayload should reject invalid status", () => {
    const result = core.validateRegistrationPayload(
      {
        registrationId: "PRISM-2026-001",
        status: "UNKNOWN",
        updatedAt: "2026-05-22T10:00:00Z"
      },
      "PRISM-2026-001"
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("status_invalid");
  });

  test("validateRegistrationPayload should reject mismatched registration ID", () => {
    const result = core.validateRegistrationPayload(
      {
        registrationId: "PRISM-2026-999",
        status: "APPROVED",
        updatedAt: "2026-05-22T10:00:00Z"
      },
      "PRISM-2026-001"
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("registrationId_mismatch");
  });

  test("mapStatusLabel should map known status values", () => {
    expect(core.mapStatusLabel("APPROVED")).toBe("APROVADO");
    expect(core.mapStatusLabel("UNDER_REVIEW")).toBe("EM ANALISE");
    expect(core.mapStatusLabel("REJECTED")).toBe("NAO APROVADO");
  });

  test("formatDateTime should preserve invalid date string", () => {
    expect(core.formatDateTime("invalid-date", "pt-BR")).toBe("invalid-date");
  });
});
