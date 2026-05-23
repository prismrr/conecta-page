const { test, expect } = require("@playwright/test");

test.describe("consent preferences e2e", () => {
  test("should save granular categories and allow revocation", async ({ page }) => {
    await page.goto("/index.html");

    await page.click("[data-consent-open]");
    await expect(page.locator("[data-consent-banner]")).toBeVisible();

    await page.check('[data-consent-category="analytics_optional"]');
    await page.uncheck('[data-consent-category="communication_optional"]');
    await page.click('[data-consent-action="save"]');

    const savedConsent = await page.evaluate(() => {
      const raw = localStorage.getItem("conecta_consent_preferences_v2");
      return raw ? JSON.parse(raw) : null;
    });

    expect(savedConsent).not.toBeNull();
    expect(savedConsent.version).toBe("consent-v2-2026-05");
    expect(savedConsent.status).toBe("granted");
    expect(savedConsent.categories.analytics_optional).toBe(true);
    expect(savedConsent.categories.communication_optional).toBe(false);

    await page.click("[data-consent-open]");
    await page.click('[data-consent-action="revoke"]');

    const revokedConsent = await page.evaluate(() => {
      const raw = localStorage.getItem("conecta_consent_preferences_v2");
      return raw ? JSON.parse(raw) : null;
    });

    expect(revokedConsent).not.toBeNull();
    expect(revokedConsent.status).toBe("revoked");
    expect(revokedConsent.categories.analytics_optional).toBe(false);
    expect(revokedConsent.categories.communication_optional).toBe(false);
  });
});