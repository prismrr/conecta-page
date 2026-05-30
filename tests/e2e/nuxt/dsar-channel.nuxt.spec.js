const { test, expect } = require("@playwright/test");

test.describe("nuxt dsar channel e2e", () => {
  test("should generate protocol and store minimal request log", async ({ page }) => {
    await page.goto("/politica-privacidade");

    const form = page.locator("[data-dsar-form]");
    const requestType = form.locator('select[name="requestType"]');
    const contactEmail = form.locator('input[name="contactEmail"]');
    const details = form.locator('textarea[name="details"]');
    const acknowledgement = form.locator('input[name="acknowledgement"]');

    await requestType.click();
    await requestType.selectOption({ value: "acesso" });
    await contactEmail.fill("titular@example.org");
    await details.fill("Solicito copia dos dados vinculados ao meu cadastro.");
    await acknowledgement.check();

    await expect(requestType).toHaveValue("acesso");
    await expect(contactEmail).toHaveValue("titular@example.org");
    await expect(acknowledgement).toBeChecked();

    await form.locator('button[type="submit"]').click();

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
