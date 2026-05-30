import { describe, test, expect } from "vitest";
import { mount } from "@vue/test-utils";
import LegalChangelogGrid from "../../../nuxt-app/components/legal/LegalChangelogGrid.vue";

describe("nuxt legal changelog component", () => {
  test("should render policy changelog cards", () => {
    const wrapper = mount(LegalChangelogGrid, {
      props: {
        kind: "policy",
        versions: [
          {
            id: "privacy-v2026.1",
            versionLabel: "v2026.1",
            status: "published",
            effectiveFrom: "2026-05-23",
            publishedAt: "2026-05-23",
            summary: "Resumo",
            changes: ["Mudanca A"]
          }
        ]
      }
    });

    expect(wrapper.find("[data-policy-changelog]").exists()).toBe(true);
    expect(wrapper.findAll(".legal-changelog-card")).toHaveLength(1);
    expect(wrapper.text()).toContain("v2026.1");
  });
});
