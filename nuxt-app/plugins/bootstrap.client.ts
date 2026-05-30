export default defineNuxtPlugin(() => {
  const consentStore = useConsentStore();
  consentStore.hydrateFromStorage();
});
