import { beforeEach, describe, expect, test } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useConsentStore } from "../../nuxt-app/stores/consent";

const createStorageShim = () => {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? String(data.get(key)) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    clear: () => data.clear()
  };
};

describe("nuxt consent store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    if (!globalThis.localStorage) {
      Object.defineProperty(globalThis, "localStorage", {
        value: createStorageShim(),
        configurable: true,
        writable: true
      });
    }
    localStorage.clear();
  });

  test("should default optional categories to false", () => {
    const store = useConsentStore();

    expect(store.categories.essential).toBe(true);
    expect(store.categories.analytics_optional).toBe(false);
    expect(store.categories.marketing_optional).toBe(false);
    expect(store.status).toBe("pending");
  });

  test("should migrate legacy communication_optional to marketing_optional", () => {
    localStorage.setItem("conecta_consent_preferences_v2", JSON.stringify({
      version: "consent-v2-2026-05",
      updatedAt: "2026-05-31T12:00:00Z",
      status: "granted",
      categories: {
        essential: true,
        analytics_optional: true,
        communication_optional: true
      }
    }));

    const store = useConsentStore();
    store.hydrateFromStorage();

    expect(store.categories.analytics_optional).toBe(true);
    expect(store.categories.marketing_optional).toBe(true);
  });

  test("should persist granular preferences and support revocation", () => {
    const store = useConsentStore();

    store.setCategory("analytics_optional", true);
    store.setCategory("marketing_optional", false);
    store.savePreferences();

    expect(store.status).toBe("granted");

    const raw = localStorage.getItem("conecta_consent_preferences_v2");
    expect(raw).toBeTruthy();

    const parsed = JSON.parse(raw || "{}");
    expect(parsed.categories.analytics_optional).toBe(true);
    expect(parsed.categories.marketing_optional).toBe(false);

    store.revokeOptional();
    expect(store.categories.analytics_optional).toBe(false);
    expect(store.categories.marketing_optional).toBe(false);
    expect(store.status).toBe("revoked");
  });
});