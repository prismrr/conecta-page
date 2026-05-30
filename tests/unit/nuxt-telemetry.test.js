import { beforeEach, describe, expect, test, vi } from "vitest";
import { useTelemetry } from "../../nuxt-app/composables/useTelemetry";

const baseConfig = {
  public: {
    telemetryEnabled: true,
    telemetryEndpoint: "/telemetry/events",
    telemetryEnvironment: "test",
    telemetryReleaseId: "nuxt-test",
    telemetrySourceChannel: "web",
    telemetryConsoleDebug: false
  }
};

describe("nuxt telemetry composable", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    window.dataLayer = [];

    globalThis.useRuntimeConfig = vi.fn(() => baseConfig);
    globalThis.useRoute = vi.fn(() => ({ path: "/inscricoes" }));
    globalThis.useConsentStore = vi.fn(() => ({
      canEmitOptionalTelemetry: false
    }));

    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true }));
    Object.defineProperty(globalThis.navigator, "sendBeacon", {
      value: vi.fn(() => true),
      writable: true,
      configurable: true
    });
  });

  test("should block optional telemetry without analytics consent", async () => {
    const { emitTelemetry } = useTelemetry();

    await emitTelemetry("registration_result_view", {
      outcome: "success"
    });

    expect(window.dataLayer).toHaveLength(0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(globalThis.navigator.sendBeacon).not.toHaveBeenCalled();
  });

  test("should always emit consent events even without optional consent", async () => {
    const { emitTelemetry } = useTelemetry();

    await emitTelemetry("consent_updated", {
      status: "granted"
    });

    expect(window.dataLayer).toHaveLength(1);
    expect(window.dataLayer[0].event).toBe("consent_updated");
    expect(globalThis.navigator.sendBeacon).toHaveBeenCalledTimes(1);
  });

  test("should emit optional events after analytics consent", async () => {
    globalThis.useConsentStore = vi.fn(() => ({
      canEmitOptionalTelemetry: true
    }));

    const { emitTelemetry } = useTelemetry();

    await emitTelemetry("faq_view", {
      total_items: 4
    });

    expect(window.dataLayer).toHaveLength(1);
    expect(window.dataLayer[0].event).toBe("faq_view");
    expect(window.dataLayer[0].release_id).toBe("nuxt-test");
    expect(globalThis.navigator.sendBeacon).toHaveBeenCalledTimes(1);
  });

  test("should fallback to fetch when sendBeacon is unavailable", async () => {
    Object.defineProperty(globalThis.navigator, "sendBeacon", {
      value: undefined,
      writable: true,
      configurable: true
    });
    globalThis.useConsentStore = vi.fn(() => ({
      canEmitOptionalTelemetry: true
    }));

    const { emitTelemetry } = useTelemetry();

    await emitTelemetry("schedule_filter_changed", {
      filter: "track"
    });

    expect(window.dataLayer).toHaveLength(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/telemetry/events",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      })
    );
  });
});
