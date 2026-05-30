const { test, expect } = require("@playwright/test");

test.describe("nuxt dsar channel e2e", () => {
  test("should generate protocol and store minimal request log", async ({ page }) => {
    await page.goto("/politica-privacidade");

    await page.selectOption('[data-dsar-form] select[name="requestType"]', "acesso");
    await page.fill('[data-dsar-form] input[name="contactEmail"]', "titular@example.org");
    await page.fill('[data-dsar-form] textarea[name="details"]', "Solicito copia dos dados vinculados ao meu cadastro.");
    await page.check('[data-dsar-form] input[name="acknowledgement"]');
    await page.locator("[data-dsar-form]").evaluate((form) => {
      form.requestSubmit();
    });

    await expect(page.locator("[data-dsar-result]")).toContainText("Protocolo: DSAR-");

    const dsarHistory = await page.evaluate(() => {
      const raw = localStorage.getItem("conecta_dsar_requests_v1");
      return raw ? JSON.parse(raw) : [];
    });

    expect(Array.isArray(dsarHistory)).toBe(true);
    expect(dsarHistory.length).toBeGreaterThan(0);

    const latest = dsarHistory[dsarHistory.length - 1];
    expect(latest.protocol).toMatch(/^DSAR-\d{8}-[A-Z0-9]{6}$/);
    expect(latest.requestType).toBe("acesso");
    expect(latest.channel).toBe("web_form");
    expect(latest.status).toBe("received");
    expect(Object.prototype.hasOwnProperty.call(latest, "contactEmail")).toBe(false);
  });
});
