import { describe, test, expect, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useLegalStore } from "../../nuxt-app/stores/legal";

describe("nuxt legal store unit tests", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  test("should expose current privacy version and changelog", () => {
    const store = useLegalStore();

    expect(store.currentPrivacyVersion?.versionLabel).toBe("v2026.1");
    expect(store.privacyChangelog).toHaveLength(2);
  });

  test("should expose current terms version and sorted audit trail", () => {
    const store = useLegalStore();

    expect(store.currentTermsVersion?.versionLabel).toBe("v2026.1");
    expect(store.sortedAuditEvents).toHaveLength(5);
    expect(store.sortedAuditEvents[0].eventId).toBe("AUD-20260523-003");
  });
});
