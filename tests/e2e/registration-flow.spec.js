const { test, expect } = require("@playwright/test");

test.describe("registration flow e2e", () => {
  test("should render current published guidance version and version history", async ({ page }) => {
    await page.goto("/pages/inscricoes.html");

    await expect(page.locator("[data-guidance-current-meta]")).toContainText("Versao vigente: v2026.2");
    await expect(page.locator("[data-guidance-current]")).toContainText("Chamada principal 2026");
    await expect(page.locator("[data-guidance-history]")).toContainText("v2026.1");
  });

  test("should render approved status for valid registration", async ({ page }) => {
    await page.goto("/pages/inscricoes.html");
    await page.fill("#inscricaoId", "PRISM-2026-001");
    await page.click("button[type='submit']");

    await expect(page.locator("[data-lookup-result]")).toContainText("Status: APROVADO");
  });

  test("should update operational monitor as available after successful lookup", async ({ page }) => {
    await page.goto("/pages/inscricoes.html");

    const initialTotal = Number(await page.locator("[data-monitor-total]").innerText());
    const initialAvailable = Number(await page.locator("[data-monitor-available]").innerText());
    const initialFailures = Number(await page.locator("[data-monitor-failures]").innerText());
    const initialDegraded = Number(await page.locator("[data-monitor-degraded]").innerText());

    await page.fill("#inscricaoId", "PRISM-2026-001");
    await page.click("button[type='submit']");

    await expect(page.locator("[data-provider-status]")).toContainText("Provider disponivel");
    await expect(page.locator("[data-monitor-total]")).toHaveText(String(initialTotal + 1));
    await expect(page.locator("[data-monitor-available]")).toHaveText(String(initialAvailable + 1));
    await expect(page.locator("[data-monitor-failures]")).toHaveText(String(initialFailures));
    await expect(page.locator("[data-monitor-degraded]")).toHaveText(String(initialDegraded));
  });

  test("should show degraded message for contract-invalid payload", async ({ page }) => {
    await page.goto("/pages/inscricoes.html");
    await page.fill("#inscricaoId", "PRISM-2026-999");
    await page.click("button[type='submit']");

    await expect(page.locator("[data-lookup-result]")).toContainText("modo degradado");
  });

  test("should signal unavailable provider and increment failure counter", async ({ page }) => {
    await page.goto("/pages/inscricoes.html");

    const initialTotal = Number(await page.locator("[data-monitor-total]").innerText());
    const initialFailures = Number(await page.locator("[data-monitor-failures]").innerText());

    await page.fill("#inscricaoId", "PRISM-2026-503");
    await page.click("button[type='submit']");

    await expect(page.locator("[data-provider-status]")).toContainText("Provider indisponivel");
    await expect(page.locator("[data-monitor-total]")).toHaveText(String(initialTotal + 1));
    await expect(page.locator("[data-monitor-failures]")).toHaveText(String(initialFailures + 1));
  });

  test("should keep monitor summary after reload using SQL persistence", async ({ page }) => {
    await page.goto("/pages/inscricoes.html");

    const initialTotal = Number(await page.locator("[data-monitor-total]").innerText());

    await page.fill("#inscricaoId", "PRISM-2026-001");
    await page.click("button[type='submit']");
    await expect(page.locator("[data-provider-status]")).toContainText("Provider disponivel");

    const afterLookupTotal = Number(await page.locator("[data-monitor-total]").innerText());
    expect(afterLookupTotal).toBeGreaterThan(initialTotal);

    await page.reload();
    await expect(page.locator("[data-monitor-total]")).toHaveText(String(afterLookupTotal));
  });

  test("should emit telemetry page_view to dataLayer", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "conecta_consent_preferences_v2",
        JSON.stringify({
          version: "consent-v2-2026-05",
          updatedAt: "2026-05-23T00:00:00.000Z",
          source: "e2e",
          status: "granted",
          categories: {
            essential: true,
            analytics_optional: true,
            communication_optional: false
          }
        })
      );
    });

    await page.goto("/pages/inscricoes.html");

    const dataLayerSize = await page.evaluate(() => {
      return Array.isArray(window.dataLayer) ? window.dataLayer.length : 0;
    });

    expect(dataLayerSize).toBeGreaterThan(0);
  });
});
