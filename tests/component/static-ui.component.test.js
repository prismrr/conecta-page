const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

function readHtml(relativePath) {
  const filePath = resolve(__dirname, "../..", relativePath);
  return readFileSync(filePath, "utf-8");
}

describe("static component structure", () => {
  test("home hero component should expose core CTA actions", () => {
    const html = readHtml("index.html");

    expect(html).toContain('<section class="hero container">');
    expect(html).toContain('data-track-click="home_primary_cta"');
    expect(html).toContain('data-track-click="home_secondary_cta"');
  });

  test("home location section should expose map anchors", () => {
    const html = readHtml("index.html");

    expect(html).toContain('class="container map-section"');
    expect(html).toContain("data-location-map-placeholder");
    expect(html).toContain("data-location-map");
  });

  test("registration status card should expose monitor component anchors", () => {
    const html = readHtml("pages/inscricoes.html");

    expect(html).toContain('class="info-card monitor-card"');
    expect(html).toContain('data-provider-status-line');
    expect(html).toContain('data-provider-status');
    expect(html).toContain('data-monitor-total');
    expect(html).toContain('data-monitor-available');
    expect(html).toContain('data-monitor-failures');
    expect(html).toContain('data-monitor-degraded');
  });

  test("schedule timeline component should expose filter and list anchors", () => {
    const html = readHtml("pages/programacao.html");

    expect(html).toContain('class="schedule-filters" data-schedule-filters');
    expect(html).toContain('data-schedule-filter="track"');
    expect(html).toContain('data-schedule-filter="period"');
    expect(html).toContain('class="timeline" data-schedule-list');
  });

  test("speaker grid component should expose rendering anchor", () => {
    const html = readHtml("pages/programacao.html");

    expect(html).toContain('class="speaker-grid" data-speaker-list');
  });
});
