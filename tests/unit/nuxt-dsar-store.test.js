import { describe, test, expect, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useDsarStore } from "../../nuxt-app/stores/dsar";

describe("nuxt dsar store unit tests", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.restoreAllMocks();
  });

  test("should generate protocol and persist minimal request data", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.123456789);
    const store = useDsarStore();

    const request = store.submit({
      requestType: "acesso",
      details: "Solicito copia dos dados."
    });

    expect(request.protocol).toMatch(/^DSAR-\d{8}-[A-Z0-9]{6}$/);
    expect(request.requestType).toBe("acesso");
    expect(request.channel).toBe("web_form");
    expect(request.status).toBe("received");

    const raw = localStorage.getItem("conecta_dsar_requests_v1");
    expect(raw).toBeTruthy();

    const history = JSON.parse(raw || "[]");
    expect(history[0].protocol).toBe(request.protocol);
    expect(Object.prototype.hasOwnProperty.call(history[0], "contactEmail")).toBe(false);

    randomSpy.mockRestore();
  });
});
