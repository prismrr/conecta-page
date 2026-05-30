const { test, expect } = require("@playwright/test");

const CRITICAL_PAGES = [
  {
    name: "home",
    path: "/",
    snapshot: "home-critical-page.png"
  },
  {
    name: "inscricoes",
    path: "/inscricoes",
    snapshot: "inscricoes-critical-page.png"
  },
  {
    name: "programacao",
    path: "/programacao",
    snapshot: "programacao-critical-page.png"
  },
  {
    name: "politica-privacidade",
    path: "/politica-privacidade",
    snapshot: "politica-privacidade-critical-page.png"
  }
];

test.describe("visual regression critical pages", () => {
  test.beforeEach(async ({ page }) => {
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
          caret-color: transparent !important;
        }
      `
    });

    await page.route("**/compliance/integration-summary", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          summary: {
            totalChecks: 0,
            availableChecks: 0,
            degradedChecks: 0,
            providerFailures: 0,
            lastEvent: null
          }
        })
      });
    });

    await page.route("**/compliance/content-audit-events?limit=100", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          events: [
            {
              eventId: "AUD-20260523-003",
              changedAt: "2026-05-23T12:40:00Z",
              contentDomain: "faq",
              contentTitle: "FAQ Curada",
              version: "v2026.1",
              author: "Equipe Editorial Conecta",
              changeSummary: "Publicacao de respostas oficiais consolidadas a partir das paginas criticas do portal.",
              changeType: "publish"
            }
          ]
        })
      });
    });
  });

  for (const pageDef of CRITICAL_PAGES) {
    test(`should match baseline for ${pageDef.name}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 2400 });
      await page.goto(pageDef.path);
      await page.waitForLoadState("networkidle");
      await page.evaluate(async () => {
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }
      });

      await expect(page).toHaveScreenshot(pageDef.snapshot, {
        fullPage: true,
        animations: "disabled",
        maxDiffPixelRatio: 0.01
      });
    });
  }
});