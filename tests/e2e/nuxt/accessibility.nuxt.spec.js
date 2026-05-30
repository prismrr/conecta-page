const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

const criticalPages = [
  { path: "/", name: "home" },
  { path: "/inscricoes", name: "inscricoes" },
  { path: "/programacao", name: "programacao" },
  { path: "/politica-privacidade", name: "politica-privacidade" }
];

test.describe("accessibility axe checks", () => {
  for (const pageEntry of criticalPages) {
    test(`should have no critical/serious axe violations on ${pageEntry.name}`, async ({ page }) => {
      await page.goto(pageEntry.path);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();

      const blockingViolations = accessibilityScanResults.violations.filter((violation) => {
        return violation.impact === "critical" || violation.impact === "serious";
      });

      expect(blockingViolations, JSON.stringify(blockingViolations, null, 2)).toEqual([]);
    });
  }
});