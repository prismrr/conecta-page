const { test, expect } = require("@playwright/test");

test.describe("nuxt consent flow e2e", () => {
  test("should support keyboard consent save, persistence and revocation", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.removeItem("conecta_consent_preferences_v2");
    });
    await page.reload();

    const modal = page.locator("[data-consent-modal]");
    const analyticsToggle = page.locator('[data-consent-category="analytics_optional"] input');
    const marketingToggle = page.locator('[data-consent-category="marketing_optional"] input');
    const saveButton = page.locator("[data-consent-save]");
    const revokeButton = page.locator("[data-consent-revoke]");
    const floatingButton = page.locator("[data-consent-fab]");

    await expect(modal).toBeVisible();
    await expect(analyticsToggle).not.toBeChecked();
    await expect(marketingToggle).not.toBeChecked();

    await analyticsToggle.focus();
    await page.keyboard.press("Space");
    await marketingToggle.focus();
    await page.keyboard.press("Space");

    await expect(analyticsToggle).toBeChecked();
    await expect(marketingToggle).toBeChecked();

    await saveButton.focus();
    await page.keyboard.press("Enter");
    await expect(modal).toBeHidden();

    const grantedConsent = await page.evaluate(() => {
      const raw = localStorage.getItem("conecta_consent_preferences_v2");
      return raw ? JSON.parse(raw) : null;
    });

    expect(grantedConsent).toBeTruthy();
    expect(grantedConsent.status).toBe("granted");
    expect(grantedConsent.categories.essential).toBe(true);
    expect(grantedConsent.categories.analytics_optional).toBe(true);
    expect(grantedConsent.categories.marketing_optional).toBe(true);

    await page.reload();
    await expect(modal).toBeHidden();

    await floatingButton.focus();
    await page.keyboard.press("Enter");
    await expect(modal).toBeVisible();

    await revokeButton.focus();
    await page.keyboard.press("Enter");
    await expect(modal).toBeHidden();

    const revokedConsent = await page.evaluate(() => {
      const raw = localStorage.getItem("conecta_consent_preferences_v2");
      return raw ? JSON.parse(raw) : null;
    });

    expect(revokedConsent).toBeTruthy();
    expect(revokedConsent.status).toBe("revoked");
    expect(revokedConsent.categories.essential).toBe(true);
    expect(revokedConsent.categories.analytics_optional).toBe(false);
    expect(revokedConsent.categories.marketing_optional).toBe(false);
  });
});