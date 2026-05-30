import { describe, test, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import DsarRequestForm from "../../../nuxt-app/components/legal/DsarRequestForm.vue";

describe("nuxt dsar form component", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  test("should render dsar form anchors", () => {
    const wrapper = mount(DsarRequestForm, {
      global: {
        plugins: [createPinia()]
      }
    });

    expect(wrapper.find("[data-dsar-form]").exists()).toBe(true);
    expect(wrapper.find("[data-dsar-result]").exists()).toBe(true);
  });
});
