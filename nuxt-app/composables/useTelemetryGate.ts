export const useTelemetryGate = () => {
  const consentStore = useConsentStore();

  const hasTelemetryConsent = computed(() => consentStore.canEmitOptionalTelemetry);

  return {
    hasTelemetryConsent
  };
};
