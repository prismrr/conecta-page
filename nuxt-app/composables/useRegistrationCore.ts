type RegistrationApiConfig = {
  baseUrl?: string;
  endpointTemplate?: string;
};

export type RegistrationResultPayload = {
  registrationId: string;
  status: "APPROVED" | "UNDER_REVIEW" | "REJECTED";
  updatedAt: string;
  detail?: string;
};

export type ValidationResult = {
  ok: boolean;
  reason?: string;
};

export const useRegistrationCore = () => {
  const buildRegistrationUrl = (apiConfig: RegistrationApiConfig, registrationId: string) => {
    const endpointTemplate = apiConfig.endpointTemplate || "/api/registrations/{registrationId}";
    const path = endpointTemplate.replace("{registrationId}", encodeURIComponent(registrationId));
    const baseUrl = apiConfig.baseUrl || "";

    if (!baseUrl) {
      return path;
    }

    return `${String(baseUrl).replace(/\/$/, "")}${path}`;
  };

  const isDateTime = (value: string) => Number.isFinite(Date.parse(value));

  const validateRegistrationPayload = (payload: unknown, registrationId: string): ValidationResult => {
    if (!payload || typeof payload !== "object") {
      return { ok: false, reason: "payload_not_object" };
    }

    const typedPayload = payload as Partial<RegistrationResultPayload>;

    if (!("registrationId" in typedPayload)) {
      return { ok: false, reason: "missing_registrationId" };
    }

    if (!("status" in typedPayload)) {
      return { ok: false, reason: "missing_status" };
    }

    if (!("updatedAt" in typedPayload)) {
      return { ok: false, reason: "missing_updatedAt" };
    }

    const allowedStatus: Record<string, boolean> = {
      APPROVED: true,
      UNDER_REVIEW: true,
      REJECTED: true
    };

    if (typeof typedPayload.registrationId !== "string") {
      return { ok: false, reason: "registrationId_type" };
    }

    if (typedPayload.registrationId.toUpperCase() !== registrationId.toUpperCase()) {
      return { ok: false, reason: "registrationId_mismatch" };
    }

    if (typeof typedPayload.status !== "string" || !allowedStatus[typedPayload.status]) {
      return { ok: false, reason: "status_invalid" };
    }

    if (typeof typedPayload.updatedAt !== "string" || !isDateTime(typedPayload.updatedAt)) {
      return { ok: false, reason: "updatedAt_invalid" };
    }

    if ("detail" in typedPayload && typeof typedPayload.detail !== "undefined" && typeof typedPayload.detail !== "string") {
      return { ok: false, reason: "detail_invalid" };
    }

    return { ok: true };
  };

  const mapStatusLabel = (status: RegistrationResultPayload["status"]) => {
    if (status === "APPROVED") {
      return "APROVADO";
    }

    if (status === "UNDER_REVIEW") {
      return "EM ANALISE";
    }

    return "NAO APROVADO";
  };

  const formatDateTime = (dateTimeIso: string, locale = "pt-BR") => {
    const date = new Date(dateTimeIso);

    if (!Number.isFinite(date.getTime())) {
      return dateTimeIso;
    }

    return date.toLocaleString(locale, {
      dateStyle: "short",
      timeStyle: "short"
    });
  };

  return {
    buildRegistrationUrl,
    validateRegistrationPayload,
    mapStatusLabel,
    formatDateTime
  };
};
