const { test, expect } = require("@playwright/test");

test.describe("speaker profiles e2e", () => {
  test("should render enriched speaker profiles with institution, bio and links", async ({ page }) => {
    await page.goto("/pages/programacao.html");

    await expect(page.locator("[data-speaker-list] .speaker-card")).toHaveCount(4);
    await expect(page.locator('[data-speaker-id="speaker-ana-moura"]')).toContainText("Laboratorio de Sistemas Embarcados da UFRR");
    await expect(page.locator('[data-speaker-id="speaker-ana-moura"]')).toContainText("Pesquisa arquiteturas embarcadas");
    await expect(page.locator('[data-speaker-id="speaker-ana-moura"] .speaker-links a')).toHaveCount(2);
  });
});