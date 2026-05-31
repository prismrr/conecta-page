export default defineNuxtPlugin(() => {
  const router = useRouter();
  const route = useRoute();
  const consentStore = useConsentStore();
  const { emitTelemetry } = useTelemetry();
  const config = useRuntimeConfig();

  let previousAnalyticsConsent = Boolean(consentStore.categories.analytics_optional);
  const previousState = {
    status: consentStore.status,
    analytics_optional: consentStore.categories.analytics_optional,
    marketing_optional: consentStore.categories.marketing_optional
  };

  const complianceCategories = () => ({
    ...consentStore.categories,
    communication_optional: consentStore.categories.marketing_optional
  });

  const postConsentRecord = async () => {
    try {
      await $fetch(`${config.public.complianceApiBase}/consent-records`, {
        method: "POST",
        body: {
          version: consentStore.version,
          updatedAt: consentStore.updatedAt,
          source: "nuxt_banner",
          status: consentStore.status,
          categories: complianceCategories()
        }
      });
      return true;
    } catch {
      // Keep local storage as source of truth when backend is unavailable.
      return false;
    }
  };

  emitTelemetry("page_view", { title: document.title }).catch(() => {});

  router.afterEach((to) => {
    emitTelemetry("page_view", {
      title: document.title,
      path: to.path
    }).catch(() => {});
  });

  watch(
    () => ({
      status: consentStore.status,
      analytics_optional: consentStore.categories.analytics_optional,
      marketing_optional: consentStore.categories.marketing_optional,
      updatedAt: consentStore.updatedAt,
      version: consentStore.version
    }),
    async (nextState) => {
      if (
        previousState.status === nextState.status &&
        previousState.analytics_optional === nextState.analytics_optional &&
        previousState.marketing_optional === nextState.marketing_optional
      ) {
        return;
      }

      previousState.status = nextState.status;
      previousState.analytics_optional = nextState.analytics_optional;
      previousState.marketing_optional = nextState.marketing_optional;

      const persisted = await postConsentRecord();

      const enabledCategories: string[] = [];
      if (nextState.analytics_optional) {
        enabledCategories.push("analytics_optional");
      }
      if (nextState.marketing_optional) {
        enabledCategories.push("marketing_optional");
      }

      await emitTelemetry(nextState.status === "revoked" ? "consent_revoked" : "consent_granted", {
        channel: "banner",
        version: nextState.version,
        status: nextState.status,
        categories: enabledCategories,
        updated_at: nextState.updatedAt
      }, { force: true });

      await emitTelemetry("consent_updated", {
        channel: "banner",
        version: nextState.version,
        status: nextState.status,
        categories: enabledCategories,
        updated_at: nextState.updatedAt
      }, { force: true });

      if (!persisted) {
        await emitTelemetry("external_data_sync_failed", {
          reason: "consent_record_unavailable",
          operation: "consent_records_post",
          status: "failed"
        }, { force: true });
      }

      if (!previousAnalyticsConsent && nextState.analytics_optional) {
        await emitTelemetry("page_view", {
          title: document.title,
          trigger: "post_consent",
          path: route.path
        });
      }

      previousAnalyticsConsent = nextState.analytics_optional;
    }
  );
});
