const { test, expect } = require("@playwright/test");

const GRANTED_CONSENT = JSON.stringify({
  version: "consent-v2-2026-05",
  updatedAt: "2026-05-31T12:00:00Z",
  status: "granted",
  categories: { essential: true, analytics_optional: false, marketing_optional: false }
});

test.describe("nuxt inscricoes e2e", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((consent) => {
      localStorage.setItem("conecta_consent_preferences_v2", consent);
    }, GRANTED_CONSENT);

    const summaryState = {
      totalChecks: 0,
      availableChecks: 0,
      providerFailures: 0,
      degradedChecks: 0,
      lastEvent: null
    };

    const signalFromOutcome = (outcome) => {
      if (outcome === "success" || outcome === "not_found" || outcome === "unauthorized") {
        return "available";
      }

      if (outcome === "contract_error") {
        return "degraded";
      }

      if (outcome === "service_unavailable") {
        return "unavailable";
      }

      return "unknown";
    };

    await page.route("**/compliance/integration-summary", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          summary: summaryState
        })
      });
    });

    await page.route("**/compliance/integration-events", async (route) => {
      const payload = route.request().postDataJSON() || {};
      const outcome = String(payload.outcome || "unknown");
      const detail = String(payload.detail || "Sem detalhe adicional.");
      const signal = signalFromOutcome(outcome);

      summaryState.totalChecks += 1;

      if (signal === "available") {
        summaryState.availableChecks += 1;
      }

      if (signal === "degraded") {
        summaryState.degradedChecks += 1;
        summaryState.providerFailures += 1;
      }

      if (signal === "unavailable") {
        summaryState.providerFailures += 1;
      }

      summaryState.lastEvent = {
        outcome,
        signal,
        detail,
        recordedAt: new Date().toISOString()
      };

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ ok: true })
      });
    });
  });

  test("should render current published guidance and history", async ({ page }) => {
    await page.goto("/inscricoes");

    await expect(page.locator("[data-guidance-current-meta]")).toContainText("Versao vigente: v2026.2");
    await expect(page.locator("[data-guidance-current]")).toContainText("Chamada principal 2026");
    await expect(page.locator("[data-guidance-history]")).toContainText("v2026.1");
  });

  test("should render approved status for valid registration", async ({ page }) => {
    await page.route("**/api/registrations/PRISM-2026-001", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          registrationId: "PRISM-2026-001",
          status: "APPROVED",
          updatedAt: "2026-05-30T12:00:00Z",
          detail: "Classificado"
        })
      });
    });

    await page.goto("/inscricoes");
    await page.waitForLoadState("networkidle");
    await page.fill("#inscricaoId", "PRISM-2026-001");
    await page.click("form[data-lookup-form] button[type='submit']");

    await expect(page.locator("[data-lookup-result]")).toContainText("Status: APROVADO", { timeout: 15000 });
    await expect(page.locator("[data-provider-status]")).toContainText("Provider disponivel");
  });

  test("should show degraded mode for contract-invalid payload", async ({ page }) => {
    await page.route("**/api/registrations/PRISM-2026-999", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          registrationId: "PRISM-2026-999",
          status: "UNKNOWN"
        })
      });
    });

    await page.goto("/inscricoes");
    await page.waitForLoadState("networkidle");
    await page.fill("#inscricaoId", "PRISM-2026-999");
    await page.click("form[data-lookup-form] button[type='submit']");

    await expect(page.locator("[data-lookup-result]")).toContainText("modo degradado", { timeout: 20000 });
    await expect(page.locator("[data-provider-status]")).toContainText("Provider em modo degradado");
  });

  test("should show not found message and keep provider available", async ({ page }) => {
    await page.route("**/api/registrations/PRISM-2026-404", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          error: "not_found"
        })
      });
    });

    await page.goto("/inscricoes");
    await page.waitForLoadState("networkidle");
    await page.fill("#inscricaoId", "PRISM-2026-404");
    await page.click("form[data-lookup-form] button[type='submit']");

    await expect(page.locator("[data-lookup-result]")).toContainText("Inscricao nao encontrada", { timeout: 15000 });
    await expect(page.locator("[data-provider-status]")).toContainText("Provider disponivel");
  });

  test("should show service unavailable and increment failure monitor", async ({ page }) => {
    await page.route("**/api/registrations/PRISM-2026-503", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "provider_unavailable"
        })
      });
    });

    await page.goto("/inscricoes");
    await page.waitForLoadState("networkidle");

    const initialTotal = Number(await page.locator("[data-monitor-total]").innerText());
    const initialFailures = Number(await page.locator("[data-monitor-failures]").innerText());

    await page.fill("#inscricaoId", "PRISM-2026-503");
    await page.click("form[data-lookup-form] button[type='submit']");

    await expect(page.locator("[data-lookup-result]")).toContainText("Servico temporariamente indisponivel", { timeout: 15000 });
    await expect(page.locator("[data-provider-status]")).toContainText("Provider indisponivel");
    await expect(page.locator("[data-monitor-total]")).toHaveText(String(initialTotal + 1));
    await expect(page.locator("[data-monitor-failures]")).toHaveText(String(initialFailures + 1));
  });

  test("should show unauthorized message and keep provider available", async ({ page }) => {
    await page.route("**/api/registrations/PRISM-2026-401", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: "unauthorized"
        })
      });
    });

    await page.goto("/inscricoes");
    await page.waitForLoadState("networkidle");
    await page.fill("#inscricaoId", "PRISM-2026-401");
    await page.click("form[data-lookup-form] button[type='submit']");

    await expect(page.locator("[data-lookup-result]")).toContainText("permissao adicional", { timeout: 15000 });
    await expect(page.locator("[data-provider-status]")).toContainText("Provider disponivel");
  });
});
