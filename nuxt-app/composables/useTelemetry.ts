type TelemetryPayload = {
  event: string;
  timestamp: string;
  page: string;
  path: string;
  release_id: string;
  environment: string;
  source_channel: string;
  session_id: string;
  data: Record<string, unknown>;
};

const SESSION_KEY = "conecta_telemetry_session_v1";

const isClientRuntime = () => typeof window !== "undefined";

const createSessionId = () => `sess-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

const getSessionId = () => {
  if (!isClientRuntime()) {
    return createSessionId();
  }

  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) {
      return existing;
    }

    const created = createSessionId();
    sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return createSessionId();
  }
};

const isConsentEvent = (eventName: string) =>
  eventName === "consent_granted" || eventName === "consent_revoked" || eventName === "consent_updated";

export const useTelemetry = () => {
  const config = useRuntimeConfig();
  const consentStore = useConsentStore();

  const buildPayload = (eventName: string, data: Record<string, unknown> = {}): TelemetryPayload => {
    const page = useRoute().path.replace(/^\//, "") || "home";

    return {
      event: eventName,
      timestamp: new Date().toISOString(),
      page,
      path: useRoute().path,
      release_id: config.public.telemetryReleaseId || "nuxt-migration",
      environment: config.public.telemetryEnvironment || "development",
      source_channel: config.public.telemetrySourceChannel || "web",
      session_id: getSessionId(),
      data
    };
  };

  const canEmit = (eventName: string, force: boolean) => {
    if (force) {
      return true;
    }

    if (isConsentEvent(eventName)) {
      return true;
    }

    return consentStore.canEmitOptionalTelemetry;
  };

  const emitTelemetry = async (
    eventName: string,
    data: Record<string, unknown> = {},
    options: { force?: boolean } = {}
  ) => {
    if (!isClientRuntime()) {
      return;
    }

    const endpoint = config.public.telemetryEndpoint;
    const enabled = config.public.telemetryEnabled !== false;

    if (!enabled || !endpoint) {
      return;
    }

    if (!canEmit(eventName, options.force === true)) {
      return;
    }

    const payload = buildPayload(eventName, data);
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);

    if (config.public.telemetryConsoleDebug === true) {
      // eslint-disable-next-line no-console
      console.info("[nuxt-telemetry]", payload);
    }

    try {
      const serialized = JSON.stringify(payload);

      if (navigator.sendBeacon) {
        const blob = new Blob([serialized], { type: "application/json" });
        navigator.sendBeacon(endpoint, blob);
        return;
      }

      await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: serialized,
        keepalive: true
      });
    } catch {
      // Keep local dataLayer fallback for telemetry failures.
    }
  };

  return {
    emitTelemetry
  };
};
