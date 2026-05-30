type IntegrationMonitor = {
  total: number;
  available: number;
  failures: number;
  degraded: number;
  signal: "unknown" | "available" | "degraded" | "unavailable";
  lastOutcome: string;
  lastCheckedAt: string | null;
  lastDetail: string;
};

const getSignalFromOutcome = (outcome: string): IntegrationMonitor["signal"] => {
  if (outcome === "success" || outcome === "not_found" || outcome === "unauthorized") {
    return "available";
  }

  if (outcome === "contract_error") {
    return "degraded";
  }

  if (outcome === "service_unavailable") {
    return "unavailable";
  }

  return "unknown";
};

export const useRegistrationStore = defineStore("registration", {
  state: () => ({
    monitor: {
      total: 0,
      available: 0,
      failures: 0,
      degraded: 0,
      signal: "unknown",
      lastOutcome: "none",
      lastCheckedAt: null,
      lastDetail: "Aguardando primeira consulta."
    } as IntegrationMonitor
  }),
  actions: {
    updateFromOutcome(outcome: string, detail: string) {
      const signal = getSignalFromOutcome(outcome);

      this.monitor.total += 1;
      this.monitor.lastOutcome = outcome || "unknown";
      this.monitor.lastCheckedAt = new Date().toISOString();
      this.monitor.lastDetail = detail || "Sem detalhe adicional.";
      this.monitor.signal = signal;

      if (signal === "available") {
        this.monitor.available += 1;
      }

      if (signal === "degraded") {
        this.monitor.degraded += 1;
        this.monitor.failures += 1;
      }

      if (signal === "unavailable") {
        this.monitor.failures += 1;
      }
    },
    applySummary(summary: Record<string, unknown>) {
      this.monitor.total = Math.max(0, Number(summary.totalChecks) || 0);
      this.monitor.available = Math.max(0, Number(summary.availableChecks) || 0);
      this.monitor.failures = Math.max(0, Number(summary.providerFailures) || 0);
      this.monitor.degraded = Math.max(0, Number(summary.degradedChecks) || 0);

      const lastEvent =
        summary.lastEvent && typeof summary.lastEvent === "object"
          ? (summary.lastEvent as Record<string, unknown>)
          : null;

      if (lastEvent) {
        const signalValue = String(lastEvent.signal || "unknown");
        this.monitor.signal =
          signalValue === "available" || signalValue === "degraded" || signalValue === "unavailable"
            ? signalValue
            : "unknown";
        this.monitor.lastOutcome = String(lastEvent.outcome || "unknown");
        this.monitor.lastCheckedAt = String(lastEvent.recordedAt || "") || null;
        this.monitor.lastDetail = String(lastEvent.detail || "Sem detalhe adicional.");
      }
    }
  }
});
