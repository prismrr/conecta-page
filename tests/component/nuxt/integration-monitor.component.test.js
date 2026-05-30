import { describe, test, expect } from "vitest";
import { mount } from "@vue/test-utils";
import IntegrationMonitorCard from "../../../nuxt-app/components/registration/IntegrationMonitorCard.vue";

describe("nuxt integration monitor component", () => {
  test("should render monitor counters and status anchors", () => {
    const wrapper = mount(IntegrationMonitorCard, {
      props: {
        signal: "available",
        statusLabel: "Provider disponivel",
        providerMetaLabel: "Ultima atualizacao: 30/05/2026 13:20",
        total: 8,
        available: 5,
        failures: 2,
        degraded: 1
      }
    });

    expect(wrapper.find("[data-provider-status]").text()).toContain("Provider disponivel");
    expect(wrapper.find("[data-monitor-total]").text()).toBe("8");
    expect(wrapper.find("[data-monitor-available]").text()).toBe("5");
    expect(wrapper.find("[data-monitor-failures]").text()).toBe("2");
    expect(wrapper.find("[data-monitor-degraded]").text()).toBe("1");
    expect(wrapper.find("[data-provider-signal]").classes()).toContain("monitor-signal-available");
  });
});
