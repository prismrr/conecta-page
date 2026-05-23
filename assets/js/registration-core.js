(function (globalScope) {
  function buildRegistrationUrl(apiConfig, registrationId) {
    var config = apiConfig || {};
    var endpointTemplate = config.endpointTemplate || "/api/registrations/{registrationId}";
    var path = endpointTemplate.replace("{registrationId}", encodeURIComponent(registrationId));
    var baseUrl = config.baseUrl || "";

    if (!baseUrl) {
      return path;
    }

    return String(baseUrl).replace(/\/$/, "") + path;
  }

  function isDateTime(value) {
    var parsed = Date.parse(value);
    return Number.isFinite(parsed);
  }

  function validateRegistrationPayload(payload, registrationId) {
    if (!payload || typeof payload !== "object") {
      return { ok: false, reason: "payload_not_object" };
    }

    var required = ["registrationId", "status", "updatedAt"];
    for (var i = 0; i < required.length; i += 1) {
      if (!(required[i] in payload)) {
        return { ok: false, reason: "missing_" + required[i] };
      }
    }

    var allowedStatus = {
      APPROVED: true,
      UNDER_REVIEW: true,
      REJECTED: true
    };

    if (typeof payload.registrationId !== "string") {
      return { ok: false, reason: "registrationId_type" };
    }

    if (payload.registrationId.toUpperCase() !== registrationId.toUpperCase()) {
      return { ok: false, reason: "registrationId_mismatch" };
    }

    if (typeof payload.status !== "string" || !allowedStatus[payload.status]) {
      return { ok: false, reason: "status_invalid" };
    }

    if (typeof payload.updatedAt !== "string" || !isDateTime(payload.updatedAt)) {
      return { ok: false, reason: "updatedAt_invalid" };
    }

    if ("detail" in payload && typeof payload.detail !== "string") {
      return { ok: false, reason: "detail_invalid" };
    }

    return { ok: true };
  }

  function mapStatusLabel(status) {
    if (status === "APPROVED") {
      return "APROVADO";
    }

    if (status === "UNDER_REVIEW") {
      return "EM ANALISE";
    }

    return "NAO APROVADO";
  }

  function formatDateTime(dateTimeIso, locale) {
    var date = new Date(dateTimeIso);
    if (!Number.isFinite(date.getTime())) {
      return dateTimeIso;
    }

    return date.toLocaleString(locale || "pt-BR", {
      dateStyle: "short",
      timeStyle: "short"
    });
  }

  var api = {
    buildRegistrationUrl: buildRegistrationUrl,
    isDateTime: isDateTime,
    validateRegistrationPayload: validateRegistrationPayload,
    mapStatusLabel: mapStatusLabel,
    formatDateTime: formatDateTime
  };

  globalScope.ConectaRegistrationCore = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
