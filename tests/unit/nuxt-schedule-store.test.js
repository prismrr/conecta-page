import { describe, test, expect, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useScheduleStore } from "../../nuxt-app/stores/schedule";

describe("nuxt schedule store unit tests", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  test("should keep sessions sorted by start time", () => {
    const store = useScheduleStore();

    expect(store.filteredSessions[0].startTime).toBe("09:00");
    expect(store.filteredSessions[store.filteredSessions.length - 1].startTime).toBe("16:00");
  });

  test("should filter by track and period", () => {
    const store = useScheduleStore();

    store.setTrack("Qualidade e Confiabilidade");
    expect(store.filteredSessions).toHaveLength(1);
    expect(store.filteredSessions[0].title).toContain("Sistemas Ciber-Fisicos e testes");

    store.setPeriod("manha");
    expect(store.filteredSessions).toHaveLength(0);
    expect(store.summaryLabel).toContain("0 sessoes exibidas");
  });
});
