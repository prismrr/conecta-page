const { test, expect } = require("@playwright/test");

test.describe("content audit trail e2e", () => {
  test("should render critical content audit events with author, date and version", async ({ page }) => {
    await page.goto("/pages/politica-privacidade.html");

    await expect(page.locator("[data-audit-list] .audit-card")).toHaveCount(5);
    await expect(page.locator("[data-audit-list] .audit-card").first()).toContainText("v2026.1");
    await expect(page.locator("[data-audit-list] .audit-card").first()).toContainText("Autor:");
    await expect(page.locator("[data-audit-list] .audit-card").first()).toContainText("Data:");
    await expect(page.locator("[data-audit-list] .audit-card").first()).toContainText("Protocolo: AUD-");
  });
});