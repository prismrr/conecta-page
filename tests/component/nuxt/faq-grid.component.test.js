import { describe, test, expect } from "vitest";
import { mount } from "@vue/test-utils";
import FaqGrid from "../../../nuxt-app/components/faq/FaqGrid.vue";

describe("nuxt faq grid component", () => {
  test("should render faq entries and anchors", () => {
    const wrapper = mount(FaqGrid, {
      props: {
        items: [
          {
            id: "faq-demo",
            category: "Geral",
            question: "Pergunta demo",
            answer: "Resposta demo"
          }
        ]
      }
    });

    expect(wrapper.find("[data-faq-list]").exists()).toBe(true);
    expect(wrapper.find("[data-faq-id='faq-demo']").exists()).toBe(true);
    expect(wrapper.text()).toContain("Pergunta demo");
  });

  test("should render empty fallback", () => {
    const wrapper = mount(FaqGrid, {
      props: {
        items: []
      }
    });

    expect(wrapper.text()).toContain("FAQ indisponivel no momento");
  });
});
