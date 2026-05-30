type ConsentStatus = "pending" | "granted" | "revoked";

type ConsentCategories = {
  essential: true;
  analytics_optional: boolean;
  communication_optional: boolean;
};

type ConsentState = {
  version: string;
  updatedAt: string | null;
  status: ConsentStatus;
  categories: ConsentCategories;
};

const STORAGE_KEY = "conecta_consent_preferences_v2";

const defaultState = (): ConsentState => ({
  version: "consent-v2-2026-05",
  updatedAt: null,
  status: "pending",
  categories: {
    essential: true,
    analytics_optional: false,
    communication_optional: false
  }
});

export const useConsentStore = defineStore("consent", {
  state: (): ConsentState => defaultState(),
  getters: {
    hasOptionalConsent: (state) => state.categories.analytics_optional || state.categories.communication_optional,
    canEmitOptionalTelemetry: (state) => state.categories.analytics_optional
  },
  actions: {
    hydrateFromStorage() {
      if (!import.meta.client) {
        return;
      }

      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }

      try {
        const parsed = JSON.parse(raw) as Partial<ConsentState>;
        this.version = parsed.version ?? this.version;
        this.updatedAt = parsed.updatedAt ?? this.updatedAt;
        this.status = (parsed.status as ConsentStatus | undefined) ?? this.status;
        this.categories = {
          essential: true,
          analytics_optional: Boolean(parsed.categories?.analytics_optional),
          communication_optional: Boolean(parsed.categories?.communication_optional)
        };
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    },
    persist() {
      if (!import.meta.client) {
        return;
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: this.version,
        updatedAt: this.updatedAt,
        status: this.status,
        categories: this.categories
      }));
    },
    grantOptional() {
      this.status = "granted";
      this.updatedAt = new Date().toISOString();
      this.categories.analytics_optional = true;
      this.categories.communication_optional = true;
      this.persist();
    },
    revokeOptional() {
      this.status = "revoked";
      this.updatedAt = new Date().toISOString();
      this.categories.analytics_optional = false;
      this.categories.communication_optional = false;
      this.persist();
    }
  }
});
