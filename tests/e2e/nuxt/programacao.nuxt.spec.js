const { test, expect } = require("@playwright/test");

test.describe("nuxt programacao e2e", () => {
  test("should render schedule sorted by time and filter by track and period", async ({ page }) => {
    await page.goto("/programacao");

    const trackFilter = page.locator('[data-schedule-filter="track"]');
    const periodFilter = page.locator('[data-schedule-filter="period"]');

    await expect(page.locator("[data-schedule-list] .timeline-item").first()).toContainText("09:00 - 09:40");
    await expect(page.locator("[data-schedule-summary]")).toContainText("6 sessoes exibidas");

    await trackFilter.selectOption({ value: "Qualidade e Confiabilidade" });
    await trackFilter.dispatchEvent("change");
    await expect(trackFilter).toHaveValue("Qualidade e Confiabilidade");
    await expect(page.locator("[data-schedule-summary]")).toContainText("1 sessao exibida");
    await expect(page.locator("[data-schedule-list]")).toContainText("Sistemas Ciber-Fisicos e testes");

    await periodFilter.selectOption({ value: "manha" });
    await periodFilter.dispatchEvent("change");
    await expect(periodFilter).toHaveValue("manha");
    await expect(page.locator("[data-schedule-summary]")).toContainText("0 sessoes exibidas");
    await expect(page.locator("[data-schedule-list]")).toContainText("Nenhuma sessao encontrada");
  });

  test("should render enriched speaker profiles with institution, bio and links", async ({ page }) => {
    await page.goto("/programacao");

    await expect(page.locator("[data-speaker-list] .speaker-card")).toHaveCount(4);
    await expect(page.locator('[data-speaker-id="speaker-ana-moura"]')).toContainText("Laboratorio de Sistemas Embarcados da UFRR");
    await expect(page.locator('[data-speaker-id="speaker-ana-moura"]')).toContainText("Pesquisa arquiteturas embarcadas");
    await expect(page.locator('[data-speaker-id="speaker-ana-moura"] .speaker-links a')).toHaveCount(2);
  });
});
