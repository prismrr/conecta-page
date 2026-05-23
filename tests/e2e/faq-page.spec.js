const { test, expect } = require("@playwright/test");

test.describe("faq page e2e", () => {
  test("should render curated faq entries sourced from official content", async ({ page }) => {
    await page.goto("/pages/faq.html");

    await expect(page.locator("[data-faq-list] .faq-item")).toHaveCount(7);
    await expect(page.locator('[data-faq-id="faq-how-to-register"]')).toContainText("pagina de inscricoes");
    await expect(page.locator('[data-faq-id="faq-programming-filters"]')).toContainText("filtrada por trilha e turno");
    await expect(page.locator(".site-nav")).toContainText("FAQ");
  });
});