import { beforeEach, describe, expect, test } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import CookieConsentManager from "../../../nuxt-app/components/privacy/CookieConsentManager.vue";
import { useConsentStore } from "../../../nuxt-app/stores/consent";

describe("cookie consent manager component", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  test("should render floating trigger and open modal", async () => {
    const wrapper = mount(CookieConsentManager, {
      attachTo: document.body,
      global: {
        plugins: [createPinia()]
      }
    });

    expect(wrapper.find("[data-consent-fab]").exists()).toBe(true);
    expect(wrapper.find("[data-consent-modal]").exists()).toBe(false);

    await wrapper.find("[data-consent-fab]").trigger("click");
    expect(wrapper.find("[data-consent-modal]").exists()).toBe(true);
  });

  test("should save granular preferences from modal", async () => {
    const wrapper = mount(CookieConsentManager, {
      attachTo: document.body,
      global: {
        plugins: [createPinia()]
      }
    });

    await wrapper.find("[data-consent-fab]").trigger("click");

    const analyticsToggle = wrapper.find('[data-consent-category="analytics_optional"] input');
    const marketingToggle = wrapper.find('[data-consent-category="marketing_optional"] input');

    await analyticsToggle.setValue(true);
    await marketingToggle.setValue(true);
    await wrapper.find("[data-consent-save]").trigger("click");

    const store = useConsentStore();
    expect(store.categories.analytics_optional).toBe(true);
    expect(store.categories.marketing_optional).toBe(true);
    expect(store.status).toBe("granted");
  });
});