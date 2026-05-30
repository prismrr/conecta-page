import { defineStore } from "pinia";
import { faqData, type FaqItem } from "../data/faq-data";

export const useFaqStore = defineStore("faq", {
  state: () => ({
    items: faqData.items as FaqItem[]
  }),
  getters: {
    count: (state) => state.items.length,
    categories: (state) => {
      const seen = new Set<string>();
      const result: string[] = [];

      state.items.forEach((item) => {
        if (seen.has(item.category)) {
          return;
        }

        seen.add(item.category);
        result.push(item.category);
      });

      return result;
    }
  }
});
