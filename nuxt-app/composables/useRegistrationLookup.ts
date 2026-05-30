import { storeToRefs } from "pinia";

type LookupErrorType = "NOT_FOUND" | "UNAUTHORIZED" | "CONTRACT" | "SERVICE_UNAVAILABLE";

type LookupError = {
  type: LookupErrorType;
  reason?: string;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getSignalFromOutcome = (outcome: string) => {
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

export const useRegistrationLookup = () => {
  const config = useRuntimeConfig();
  const { buildRegistrationUrl, validateRegistrationPayload, mapStatusLabel, formatDateTime } = useRegistrationCore();
  const { emitTelemetry } = useTelemetry();
  const registrationStore = useRegistrationStore();
  const { monitor } = storeToRefs(registrationStore);

  const lookupInput = ref("");
  const lookupResult = ref("");
  const isLoading = ref(false);

  const apiConfig = {
    baseUrl: "",
    endpointTemplate: `${config.public.registrationApiBase}/{registrationId}`,
    timeoutMs: 5000,
    maxRetries: 3,
    externalRegistrationUrl: config.public.registrationExternalUrl || "#"
  };

  const providerStatusLabel = computed(() => {
    if (monitor.value.signal === "available") {
      return "Provider disponivel";
    }
    if (monitor.value.signal === "degraded") {
      return "Provider em modo degradado";
    }
    if (monitor.value.signal === "unavailable") {
      return "Provider indisponivel";
    }
    return "Status operacional pendente";
  });

  const providerMetaLabel = computed(() => {
    if (!monitor.value.lastCheckedAt) {
      return "Ultima atualizacao: ainda sem verificacoes.";
    }

    return `Ultima atualizacao: ${formatDateTime(monitor.value.lastCheckedAt)} · Evento: ${monitor.value.lastOutcome} · Detalhe: ${monitor.value.lastDetail}`;
  });

  const postIntegrationEvent = async (outcome: string, detail: string) => {
    try {
      const signal = getSignalFromOutcome(outcome);
      await $fetch(`${config.public.complianceApiBase}/integration-events`, {
        method: "POST",
        body: {
          outcome,
          signal,
          detail,
          sourcePage: "inscricoes"
        }
      });

      const summaryPayload = await $fetch<{ summary?: Record<string, unknown> }>(`${config.public.complianceApiBase}/integration-summary`);
      if (summaryPayload?.summary) {
        registrationStore.applySummary(summaryPayload.summary);
      }
    } catch {
      // Keep optimistic in-memory monitor if backend is unavailable.
    }
  };

  const fetchRegistrationResult = async (registrationId: string) => {
    const attempts = Math.max(1, Number(apiConfig.maxRetries) || 3);
    const timeoutMs = Math.max(1000, Number(apiConfig.timeoutMs) || 5000);
    const requestUrl = buildRegistrationUrl(apiConfig, registrationId);
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(requestUrl, {
          method: "GET",
          headers: {
            Accept: "application/json"
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.status === 404) {
          throw { type: "NOT_FOUND" } as LookupError;
        }

        if (response.status === 401 || response.status === 403) {
          throw { type: "UNAUTHORIZED" } as LookupError;
        }

        if (!response.ok) {
          throw { type: "SERVICE_UNAVAILABLE" } as LookupError;
        }

        const payload = await response.json();
        const validation = validateRegistrationPayload(payload, registrationId);

        if (!validation.ok) {
          throw { type: "CONTRACT", reason: validation.reason } as LookupError;
        }

        return payload;
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error;

        const typedError = error as LookupError;
        const isFinalAttempt = attempt >= attempts;

        if (!isFinalAttempt && typedError.type !== "NOT_FOUND" && typedError.type !== "UNAUTHORIZED") {
          await wait(attempt * 300);
          continue;
        }

        throw typedError;
      }
    }

    throw (lastError as LookupError) || ({ type: "SERVICE_UNAVAILABLE" } as LookupError);
  };

  const submitLookup = async () => {
    const value = lookupInput.value.trim().toUpperCase();

    if (!value) {
      lookupResult.value = "Informe um codigo valido.";
      return;
    }

    isLoading.value = true;
    lookupResult.value = "Consultando resultado...";

    try {
      const result = await fetchRegistrationResult(value);
      const statusLabel = mapStatusLabel(result.status);
      const detail = typeof result.detail === "string" && result.detail ? ` - ${result.detail}` : "";
      lookupResult.value = `Status: ${statusLabel} (atualizado em ${formatDateTime(result.updatedAt)})${detail}`;

      registrationStore.updateFromOutcome("success", "Consulta concluida com payload valido.");
      await postIntegrationEvent("success", "Consulta concluida com payload valido.");
      await emitTelemetry("registration_result_view", {
        registration_id: value,
        outcome: "success",
        status: result.status
      });
    } catch (error) {
      const typedError = error as LookupError;

      if (typedError.type === "NOT_FOUND") {
        lookupResult.value = "Inscricao nao encontrada. Confira o codigo e tente novamente.";
        registrationStore.updateFromOutcome("not_found", "Provider respondeu sem correspondencia para o codigo informado.");
        await postIntegrationEvent("not_found", "Provider respondeu sem correspondencia para o codigo informado.");
        await emitTelemetry("registration_result_view", {
          registration_id: value,
          outcome: "not_found"
        });
        isLoading.value = false;
        return;
      }

      if (typedError.type === "UNAUTHORIZED") {
        lookupResult.value = "A consulta requer permissao adicional. Entre em contato com o suporte do evento.";
        registrationStore.updateFromOutcome("unauthorized", "Provider exige autorizacao adicional para consulta.");
        await postIntegrationEvent("unauthorized", "Provider exige autorizacao adicional para consulta.");
        await emitTelemetry("registration_result_view", {
          registration_id: value,
          outcome: "unauthorized"
        });
        isLoading.value = false;
        return;
      }

      if (typedError.type === "CONTRACT") {
        lookupResult.value = "Servico temporariamente em modo degradado. Contrato de resposta invalido no provedor externo.";
        const reason = typedError.reason || "unknown";
        registrationStore.updateFromOutcome("contract_error", `Falha de contrato: ${reason}`);
        await postIntegrationEvent("contract_error", `Falha de contrato: ${reason}`);
        await emitTelemetry("registration_result_view", {
          registration_id: value,
          outcome: "contract_error"
        });
        await emitTelemetry("external_data_sync_failed", {
          registration_id: value,
          reason: "contract_validation_failed",
          detail: reason
        });
        isLoading.value = false;
        return;
      }

      lookupResult.value = "Servico temporariamente indisponivel. Tente novamente em instantes.";
      registrationStore.updateFromOutcome("service_unavailable", "Falha operacional ou timeout no provider externo.");
      await postIntegrationEvent("service_unavailable", "Falha operacional ou timeout no provider externo.");
      await emitTelemetry("registration_result_view", {
        registration_id: value,
        outcome: "service_unavailable"
      });
      await emitTelemetry("external_data_sync_failed", {
        registration_id: value,
        reason: "provider_unavailable"
      });
    } finally {
      isLoading.value = false;
    }
  };

  const loadSummary = async () => {
    try {
      const payload = await $fetch<{ summary?: Record<string, unknown> }>(`${config.public.complianceApiBase}/integration-summary`);
      if (payload?.summary) {
        registrationStore.applySummary(payload.summary);
      }
    } catch {
      // Keep default empty summary when endpoint is unavailable.
    }
  };

  return {
    apiConfig,
    monitor,
    lookupInput,
    lookupResult,
    isLoading,
    providerStatusLabel,
    providerMetaLabel,
    submitLookup,
    loadSummary
  };
};
