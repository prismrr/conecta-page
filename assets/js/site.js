(function () {
  var appConfig = window.CONectaConfig || {};
  var telemetryConfig = appConfig.telemetry || {};
  var telemetrySessionKey = "conecta_telemetry_session_v1";

  function createSessionId() {
    return "sess-" + Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
  }

  function getSessionId() {
    try {
      var existing = sessionStorage.getItem(telemetrySessionKey);
      if (existing) {
        return existing;
      }

      var created = createSessionId();
      sessionStorage.setItem(telemetrySessionKey, created);
      return created;
    } catch (_error) {
      return createSessionId();
    }
  }

  function buildTelemetryPayload(eventName, data) {
    var body = document.body;
    var pageId = body ? body.getAttribute("data-page") || "unknown" : "unknown";

    return {
      event: eventName,
      timestamp: new Date().toISOString(),
      page: pageId,
      path: window.location.pathname,
      release_id: telemetryConfig.releaseId || "unknown",
      environment: telemetryConfig.environment || "unknown",
      source_channel: telemetryConfig.sourceChannel || "web",
      session_id: getSessionId(),
      data: data || {}
    };
  }

  function emitTelemetry(eventName, data) {
    if (!telemetryConfig.enabled) {
      return;
    }

    var payload = buildTelemetryPayload(eventName, data);
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);

    if (telemetryConfig.consoleDebug) {
      console.info("[telemetry]", payload);
    }

    var endpointUrl = telemetryConfig.endpointUrl;
    if (!endpointUrl) {
      return;
    }

    try {
      var serialized = JSON.stringify(payload);

      if (navigator.sendBeacon) {
        var blob = new Blob([serialized], { type: "application/json" });
        navigator.sendBeacon(endpointUrl, blob);
        return;
      }

      fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: serialized,
        keepalive: true
      }).catch(function () {
        // No-op: local fallback already pushed to dataLayer.
      });
    } catch (_error) {
      // No-op: local fallback already pushed to dataLayer.
    }
  }

  var menuBtn = document.querySelector("[data-menu-toggle]");
  var menu = document.querySelector("[data-menu]");

  if (menuBtn && menu) {
    menuBtn.addEventListener("click", function () {
      menu.classList.toggle("is-open");
    });
  }

  emitTelemetry("page_view", {
    title: document.title
  });

  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    var trackElement = target.closest("[data-track-click]");
    if (!(trackElement instanceof Element)) {
      return;
    }

    var trackName = trackElement.getAttribute("data-track-click");
    if (!trackName) {
      return;
    }

    emitTelemetry("cta_click", {
      cta_id: trackName,
      text: trackElement.textContent ? trackElement.textContent.trim() : ""
    });
  });

  var consentKey = "conecta_consent_v1";
  var consentBanner = document.querySelector("[data-consent-banner]");

  if (consentBanner) {
    var storedConsent = localStorage.getItem(consentKey);
    if (!storedConsent) {
      consentBanner.hidden = false;
    }

    consentBanner.addEventListener("click", function (event) {
      var target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      var value = target.getAttribute("data-consent");
      if (!value) {
        return;
      }

      localStorage.setItem(consentKey, value);
      consentBanner.hidden = true;

      if (value === "accept") {
        emitTelemetry("consent_granted", {
          channel: "banner",
          categories: ["essential", "analytics_optional"]
        });
      }

      if (value === "reject") {
        emitTelemetry("consent_revoked", {
          channel: "banner",
          categories: ["analytics_optional"]
        });
      }
    });
  }

  var lookupForm = document.querySelector("[data-lookup-form]");
  var lookupResult = document.querySelector("[data-lookup-result]");
  var externalRegistrationLink = document.querySelector("[data-external-registration-link]");
  var apiConfig = appConfig.registrationApi || {};
  var registrationCore = window.ConectaRegistrationCore || {};

  if (externalRegistrationLink && apiConfig.externalRegistrationUrl) {
    externalRegistrationLink.setAttribute("href", apiConfig.externalRegistrationUrl);
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function buildRegistrationUrl(registrationId) {
    if (typeof registrationCore.buildRegistrationUrl === "function") {
      return registrationCore.buildRegistrationUrl(apiConfig, registrationId);
    }

    var endpointTemplate = apiConfig.endpointTemplate || "/api/registrations/{registrationId}";
    return endpointTemplate.replace("{registrationId}", encodeURIComponent(registrationId));
  }

  function validateRegistrationPayload(payload, registrationId) {
    if (typeof registrationCore.validateRegistrationPayload === "function") {
      return registrationCore.validateRegistrationPayload(payload, registrationId);
    }

    return { ok: true };
  }

  function mapStatusLabel(status) {
    if (typeof registrationCore.mapStatusLabel === "function") {
      return registrationCore.mapStatusLabel(status);
    }

    return status;
  }

  function formatDateTime(dateTimeIso) {
    if (typeof registrationCore.formatDateTime === "function") {
      return registrationCore.formatDateTime(dateTimeIso, "pt-BR");
    }

    return dateTimeIso;
  }

  async function fetchRegistrationResult(registrationId) {
    var attempts = Math.max(1, Number(apiConfig.maxRetries) || 3);
    var timeoutMs = Math.max(1000, Number(apiConfig.timeoutMs) || 5000);
    var requestUrl = buildRegistrationUrl(registrationId);
    var lastError;

    for (var attempt = 1; attempt <= attempts; attempt += 1) {
      var controller = new AbortController();
      var timeoutId = setTimeout(
        (function (currentController) {
          return function () {
            currentController.abort();
          };
        })(controller),
        timeoutMs
      );

      try {
        var response = await fetch(requestUrl, {
          method: "GET",
          headers: {
            Accept: "application/json"
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.status === 404) {
          throw { type: "NOT_FOUND" };
        }

        if (response.status === 401 || response.status === 403) {
          throw { type: "UNAUTHORIZED" };
        }

        if (!response.ok) {
          throw { type: "HTTP", status: response.status };
        }

        var payload = await response.json();
        var validation = validateRegistrationPayload(payload, registrationId);

        if (!validation.ok) {
          throw { type: "CONTRACT", reason: validation.reason };
        }

        return payload;
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error;

        var isFinalAttempt = attempt >= attempts;
        if (!isFinalAttempt && error && error.type !== "NOT_FOUND" && error.type !== "UNAUTHORIZED") {
          await wait(attempt * 300);
          continue;
        }

        throw lastError;
      }
    }

    throw lastError;
  }

  if (lookupForm && lookupResult) {
    emitTelemetry("registration_guideline_view", {
      page: "inscricoes"
    });

    lookupForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      var input = lookupForm.querySelector("#inscricaoId");

      if (!(input instanceof HTMLInputElement)) {
        return;
      }

      var value = input.value.trim().toUpperCase();
      if (!value) {
        lookupResult.textContent = "Informe um codigo valido.";
        return;
      }

      lookupResult.textContent = "Consultando resultado...";

      try {
        var result = await fetchRegistrationResult(value);
        var statusLabel = mapStatusLabel(result.status);
        var detail = result.detail ? " - " + result.detail : "";
        lookupResult.textContent =
          "Status: " +
          statusLabel +
          " (atualizado em " +
          formatDateTime(result.updatedAt) +
          ")" +
          detail;

        emitTelemetry("registration_result_view", {
          registration_id: value,
          outcome: "success",
          status: result.status
        });
      } catch (error) {
        if (error && error.type === "NOT_FOUND") {
          lookupResult.textContent = "Inscricao nao encontrada. Confira o codigo e tente novamente.";
          emitTelemetry("registration_result_view", {
            registration_id: value,
            outcome: "not_found"
          });
          return;
        }

        if (error && error.type === "UNAUTHORIZED") {
          lookupResult.textContent = "A consulta requer permissao adicional. Entre em contato com o suporte do evento.";
          emitTelemetry("registration_result_view", {
            registration_id: value,
            outcome: "unauthorized"
          });
          return;
        }

        if (error && error.type === "CONTRACT") {
          lookupResult.textContent = "Servico temporariamente em modo degradado. Contrato de resposta invalido no provedor externo.";
          console.error("Contract validation error:", error.reason);
          emitTelemetry("registration_result_view", {
            registration_id: value,
            outcome: "contract_error"
          });
          emitTelemetry("external_data_sync_failed", {
            registration_id: value,
            reason: "contract_validation_failed",
            detail: error.reason || "unknown"
          });
          return;
        }

        lookupResult.textContent = "Servico temporariamente indisponivel. Tente novamente em instantes.";
        emitTelemetry("registration_result_view", {
          registration_id: value,
          outcome: "service_unavailable"
        });
        emitTelemetry("external_data_sync_failed", {
          registration_id: value,
          reason: "provider_unavailable"
        });
      }
    });
  }
})();
