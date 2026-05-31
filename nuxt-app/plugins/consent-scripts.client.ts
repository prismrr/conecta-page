export default defineNuxtPlugin(() => {
  const consentStore = useConsentStore();
  const config = useRuntimeConfig();

  const analyticsScriptSrc = String(config.public.analyticsScriptSrc || "").trim();
  const marketingScriptSrc = String(config.public.marketingScriptSrc || "").trim();

  const ensureScript = (id: string, src: string) => {
    if (!src) {
      return;
    }

    const existing = document.getElementById(id);
    if (existing) {
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.setAttribute("data-consent-managed", "true");
    document.head.appendChild(script);
  };

  const removeScript = (id: string) => {
    const existing = document.getElementById(id);
    if (existing) {
      existing.remove();
    }
  };

  watch(
    () => ({
      analyticsAccepted: consentStore.analyticsAccepted,
      marketingAccepted: consentStore.marketingAccepted
    }),
    (state) => {
      if (state.analyticsAccepted) {
        ensureScript("consent-analytics-script", analyticsScriptSrc);
      } else {
        removeScript("consent-analytics-script");
      }

      if (state.marketingAccepted) {
        ensureScript("consent-marketing-script", marketingScriptSrc);
      } else {
        removeScript("consent-marketing-script");
      }
    },
    { immediate: true }
  );
});