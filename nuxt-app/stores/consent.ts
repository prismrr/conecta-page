import { defineStore } from "pinia";

type ConsentStatus = "pending" | "granted" | "revoked";

type ConsentCategories = {
  essential: true;
  analytics_optional: boolean;
  marketing_optional: boolean;
};

type ConsentState = {
  version: string;
  updatedAt: string | null;
  status: ConsentStatus;
  categories: ConsentCategories;
};

const STORAGE_KEY = "conecta_consent_preferences_v2";

const canUseStorage = () => {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
};

const defaultState = (): ConsentState => ({
  version: "consent-v2-2026-05",
  updatedAt: null,
  status: "pending",
  categories: {
    essential: true,
    analytics_optional: false,
    marketing_optional: false
  }
});

type HydratedConsentState = Partial<ConsentState> & {
  categories?: Partial<ConsentCategories> & {
    communication_optional?: boolean;
  };
};

export const useConsentStore = defineStore("consent", {
  state: (): ConsentState => defaultState(),
  actions: {
    hydrateFromStorage() {
      if (!canUseStorage()) {
        return;
      }

      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }

      try {
        const parsed = JSON.parse(raw) as HydratedConsentState;
        const migratedMarketingOptional =
          typeof parsed.categories?.marketing_optional === "boolean"
            ? parsed.categories.marketing_optional
            : Boolean(parsed.categories?.communication_optional);

        this.version = parsed.version ?? this.version;
        this.updatedAt = parsed.updatedAt ?? this.updatedAt;
        this.status = (parsed.status as ConsentStatus | undefined) ?? this.status;
        this.categories = {
          essential: true,
          analytics_optional: Boolean(parsed.categories?.analytics_optional),
          marketing_optional: migratedMarketingOptional
        };
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    },
    persist() {
      if (!canUseStorage()) {
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
      this.categories.marketing_optional = true;
      this.persist();
    },
    revokeOptional() {
      this.status = "revoked";
      this.updatedAt = new Date().toISOString();
      this.categories.analytics_optional = false;
      this.categories.marketing_optional = false;
      this.persist();
    },
    setCategory(category: keyof ConsentCategories, value: boolean) {
      if (category === "essential") {
        this.categories.essential = true;
        return;
      }

      this.categories[category] = value;
    },
    savePreferences() {
      this.status = this.categories.analytics_optional || this.categories.marketing_optional ? "granted" : "revoked";
      this.updatedAt = new Date().toISOString();
      this.persist();
    }
  },
  getters: {
    canEmitOptionalTelemetry: (state) => state.categories.analytics_optional,
    analyticsAccepted: (state) => state.categories.analytics_optional,
    marketingAccepted: (state) => state.categories.marketing_optional
  }
});
