import { describe, test, expect, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useFaqStore } from "../../nuxt-app/stores/faq";

describe("nuxt faq store unit tests", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  test("should expose the curated faq items", () => {
    const store = useFaqStore();

    expect(store.count).toBe(7);
    expect(store.items.find((item) => item.id === "faq-how-to-register")?.answer).toContain("pagina de inscricoes");
  });

  test("should expose distinct categories", () => {
    const store = useFaqStore();

    expect(store.categories).toEqual(["Geral", "Inscricoes", "Programacao", "Privacidade"]);
  });
});
