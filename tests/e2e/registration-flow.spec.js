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

  test("should show degraded message for contract-invalid payload", async ({ page }) => {
    await page.goto("/pages/inscricoes.html");
    await page.fill("#inscricaoId", "PRISM-2026-999");
    await page.click("button[type='submit']");

    await expect(page.locator("[data-lookup-result]")).toContainText("modo degradado");
  });

  test("should emit telemetry page_view to dataLayer", async ({ page }) => {
    await page.goto("/pages/inscricoes.html");

    const dataLayerSize = await page.evaluate(() => {
      return Array.isArray(window.dataLayer) ? window.dataLayer.length : 0;
    });

    expect(dataLayerSize).toBeGreaterThan(0);
  });
});
