import { defineStore } from "pinia";

type DsarRequest = {
  protocol: string;
  requestType: string;
  details: string;
  createdAt: string;
  channel: string;
  status: string;
};

const STORAGE_KEY = "conecta_dsar_requests_v1";

const isClientRuntime = () => typeof window !== "undefined" && typeof localStorage !== "undefined";

const createProtocol = () => {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `DSAR-${y}${m}${d}-${suffix}`;
};

export const useDsarStore = defineStore("dsar", {
  state: () => ({
    resultMessage: "Preencha o formulario para gerar seu protocolo de atendimento.",
    history: [] as DsarRequest[]
  }),
  actions: {
    hydrate() {
      if (!isClientRuntime()) {
        return;
      }

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        this.history = Array.isArray(parsed) ? parsed : [];
      } catch {
        this.history = [];
      }
    },
    submit(payload: { requestType: string; details?: string; protocol?: string; channel?: string; status?: string }) {
      const protocol = payload.protocol || createProtocol();
      const request: DsarRequest = {
        protocol,
        requestType: payload.requestType,
        details: payload.details || "",
        createdAt: new Date().toISOString(),
        channel: payload.channel || "web_form",
        status: payload.status || "received"
      };

      this.history.push(request);
      this.resultMessage =
        `Solicitacao registrada com sucesso. Protocolo: ${protocol}. ` +
        "Prazo inicial de resposta: ate 15 dias corridos.";

      if (isClientRuntime()) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history));
        } catch {
          // Ignore storage write errors in restricted contexts.
        }
      }

      return request;
    }
  }
});
