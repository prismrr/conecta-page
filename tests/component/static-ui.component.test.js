const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

function readHtml(relativePath) {
  const filePath = resolve(__dirname, "../..", relativePath);
  return readFileSync(filePath, "utf-8");
}

describe("static component structure", () => {
  test("header navigation should group legal links under Mais dropdown", () => {
    const html = readHtml("nuxt-app/components/layout/Header.vue");

    expect(html).toContain("Mais");
    expect(html).toContain('class="menu-more-panel"');
    expect(html).toContain('"/politica-privacidade"');
    expect(html).toContain('"/termos-uso"');
  });

  test("app shell should render global top banner component", () => {
    const html = readHtml("nuxt-app/app.vue");

    expect(html).toContain("<LayoutTopBanner />");
  });

  test("home hero component should expose core CTA actions", () => {
    const html = readHtml("nuxt-app/pages/index.vue");

    expect(html).toContain('<section class="card hero">');
    expect(html).toContain('to="/inscricoes"');
    expect(html).toContain('to="/programacao"');
    expect(html).toContain('to="/faq"');
    expect(html).toContain('to="/politica-privacidade"');
  });

  test("home location section should expose map anchors", () => {
    const html = readHtml("nuxt-app/pages/politica-privacidade.vue");

    expect(html).toContain('data-policy-current-meta');
    expect(html).toContain('<AuditTrailGrid :events="sortedAuditEvents" />');
    expect(html).toContain('<DsarRequestForm />');
  });

  test("home event news feed should expose content anchors", () => {
    const html = readHtml("nuxt-app/pages/programacao.vue");

    expect(html).toContain('class="schedule-filters" data-schedule-filters');
    expect(html).toContain('data-schedule-filter="track"');
    expect(html).toContain('data-schedule-filter="period"');
    expect(html).toContain('<ScheduleSpeakerGrid :speakers="speakers" />');
  });

  test("registration status card should expose monitor component anchors", () => {
    const html = readHtml("nuxt-app/pages/inscricoes.vue");

    expect(html).toContain('data-guidance-current-meta');
    expect(html).toContain('data-guidance-history');
    expect(html).toContain('data-lookup-form');
    expect(html).toContain('data-lookup-result');
    expect(html).toContain('RegistrationIntegrationMonitorCard');
    expect(html).toContain('providerStatusLabel');
    expect(html).toContain('providerMetaLabel');
    expect(html).toContain(':total="monitor.total"');
    expect(html).toContain(':available="monitor.available"');
    expect(html).toContain(':failures="monitor.failures"');
    expect(html).toContain(':degraded="monitor.degraded"');
  });

  test("schedule timeline component should expose filter and list anchors", () => {
    const html = readHtml("nuxt-app/pages/programacao.vue");

    expect(html).toContain('class="schedule-filters" data-schedule-filters');
    expect(html).toContain('data-schedule-filter="track"');
    expect(html).toContain('data-schedule-filter="period"');
    expect(html).toContain('data-schedule-summary');
    expect(html).toContain('<ScheduleTimeline :sessions="filteredSessions" />');
  });

  test("speaker grid component should expose rendering anchor", () => {
    const html = readHtml("nuxt-app/pages/programacao.vue");

    expect(html).toContain('<ScheduleSpeakerGrid :speakers="speakers" />');
  });
});
