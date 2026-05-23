const { test, expect } = require("@playwright/test");

test.describe("schedule filters e2e", () => {
  test("should render schedule sorted by time and filter by track and period", async ({ page }) => {
    await page.goto("/pages/programacao.html");

    await expect(page.locator("[data-schedule-list] .timeline-item").first()).toContainText("09:00 - 09:40");
    await expect(page.locator("[data-schedule-summary]")).toContainText("6 sessoes exibidas");

    await page.selectOption('[data-schedule-filter="track"]', "Qualidade e Confiabilidade");
    await expect(page.locator("[data-schedule-summary]")).toContainText("1 sessao exibida");
    await expect(page.locator("[data-schedule-list]")).toContainText("Sistemas Ciber-Fisicos e testes");

    await page.selectOption('[data-schedule-filter="period"]', "manha");
    await expect(page.locator("[data-schedule-summary]")).toContainText("0 sessoes exibidas");
    await expect(page.locator("[data-schedule-list]")).toContainText("Nenhuma sessao encontrada");
  });
});