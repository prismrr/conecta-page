window.CONectaConfig = {
  registrationApi: {
    // Replace with real provider base URL (example: "https://api.seudominio.br")
    baseUrl: "",
    // Must expose a GET endpoint with {registrationId} placeholder.
    endpointTemplate: "/api/registrations/{registrationId}",
    timeoutMs: 5000,
    maxRetries: 3,
    // External registration system URL (button destination).
    externalRegistrationUrl: "#"
  },
  telemetry: {
    enabled: true,
    // Replace with telemetry collector endpoint (example: "https://api.seudominio.br/telemetry/events")
    endpointUrl: "/telemetry/events",
    environment: "development",
    releaseId: "mvp-0.2.0",
    sourceChannel: "web",
    consoleDebug: true
  },
  compliance: {
    enabled: true,
    // Base path for SQL-backed compliance persistence endpoints.
    basePath: "/compliance"
  },
  topBanner: {
    enabled: true,
    label: "Comunicado:",
    message: "",
    imageUrl: "/assets/images/top-banner-full.svg",
    imageAlt: "Banner visual do Conecta PrismRR",
    hideText: true
  }
};
