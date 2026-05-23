const { test, expect } = require("@playwright/test");

test.describe("legal documents versioning e2e", () => {
  test("should show privacy policy version, effective date and changelog", async ({ page }) => {
    await page.goto("/pages/politica-privacidade.html");

    await expect(page.locator("[data-policy-current-meta]")).toContainText("Versao vigente: v2026.1");
    await expect(page.locator("[data-policy-current-meta]")).toContainText("em vigor desde");
    await expect(page.locator("[data-policy-changelog] .legal-changelog-card")).toHaveCount(2);
    await expect(page.locator("[data-policy-changelog]")).toContainText("v2026.0");
  });

  test("should show terms version, effective date and changelog", async ({ page }) => {
    await page.goto("/pages/termos-uso.html");

    await expect(page.locator("[data-terms-current-meta]")).toContainText("Versao vigente: v2026.1");
    await expect(page.locator("[data-terms-current-meta]")).toContainText("em vigor desde");
    await expect(page.locator("[data-terms-changelog] .legal-changelog-card")).toHaveCount(1);
    await expect(page.locator("[data-terms-current]")).toContainText("Termo de Uso vigente");
  });
});