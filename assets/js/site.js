(function () {
  var appConfig = window.CONectaConfig || {};
  var telemetryConfig = appConfig.telemetry || {};
  var telemetrySessionKey = "conecta_telemetry_session_v1";
  var consentStorageKey = "conecta_consent_preferences_v2";
  var consentLegacyKey = "conecta_consent_v1";
  var consentVersion = "consent-v2-2026-05";
  var cookieDefinitions = {
    essential: {
      name: "conecta_cookie_essential",
      value: "1",
      maxAgeDays: 180
    },
    analytics_optional: {
      name: "conecta_cookie_analytics_optin",
      value: "1",
      maxAgeDays: 180
    },
    communication_optional: {
      name: "conecta_cookie_communication_optin",
      value: "1",
      maxAgeDays: 180
    }
  };

  function setCookie(name, value, maxAgeDays) {
    var maxAgeSeconds = Math.max(0, Math.floor(Number(maxAgeDays || 0) * 24 * 60 * 60));
    document.cookie =
      name +
      "=" +
      encodeURIComponent(String(value)) +
      "; Path=/; Max-Age=" +
      maxAgeSeconds +
      "; SameSite=Lax";
  }

  function removeCookie(name) {
    document.cookie = name + "=; Path=/; Max-Age=0; SameSite=Lax";
  }

  function syncCookiesFromConsent(record) {
    var categories = normalizeConsentCategories(record && record.categories ? record.categories : null);

    setCookie(cookieDefinitions.essential.name, cookieDefinitions.essential.value, cookieDefinitions.essential.maxAgeDays);

    if (categories.analytics_optional) {
      setCookie(
        cookieDefinitions.analytics_optional.name,
        cookieDefinitions.analytics_optional.value,
        cookieDefinitions.analytics_optional.maxAgeDays
      );
    } else {
      removeCookie(cookieDefinitions.analytics_optional.name);
    }

    if (categories.communication_optional) {
      setCookie(
        cookieDefinitions.communication_optional.name,
        cookieDefinitions.communication_optional.value,
        cookieDefinitions.communication_optional.maxAgeDays
      );
    } else {
      removeCookie(cookieDefinitions.communication_optional.name);
    }
  }

  function normalizeConsentCategories(categories) {
    return {
      essential: true,
      analytics_optional: !!(categories && categories.analytics_optional),
      communication_optional: !!(categories && categories.communication_optional)
    };
  }

  function deriveConsentStatus(categories) {
    if (categories.analytics_optional || categories.communication_optional) {
      return "granted";
    }

    return "revoked";
  }

  function buildConsentRecord(categories, source) {
    var normalizedCategories = normalizeConsentCategories(categories);
    return {
      version: consentVersion,
      updatedAt: new Date().toISOString(),
      source: source || "banner",
      status: deriveConsentStatus(normalizedCategories),
      categories: normalizedCategories
    };
  }

  function writeConsentRecord(record) {
    try {
      localStorage.setItem(consentStorageKey, JSON.stringify(record));
      localStorage.removeItem(consentLegacyKey);
    } catch (_error) {
      // No-op: browser storage may be unavailable in private contexts.
    }
  }

  function readConsentRecord() {
    try {
      var stored = localStorage.getItem(consentStorageKey);
      if (stored) {
        var parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          return {
            version: parsed.version || consentVersion,
            updatedAt: parsed.updatedAt || null,
            source: parsed.source || "banner",
            status: parsed.status || deriveConsentStatus(normalizeConsentCategories(parsed.categories)),
            categories: normalizeConsentCategories(parsed.categories)
          };
        }
      }

      var legacyValue = localStorage.getItem(consentLegacyKey);
      if (legacyValue === "accept" || legacyValue === "reject") {
        var migrated = buildConsentRecord(
          {
            analytics_optional: legacyValue === "accept",
            communication_optional: false
          },
          "legacy_migration"
        );
        writeConsentRecord(migrated);
        return migrated;
      }

      return null;
    } catch (_error) {
      return null;
    }
  }

  var consentRecord = readConsentRecord();
  syncCookiesFromConsent(consentRecord);

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

  function isConsentEvent(eventName) {
    return eventName === "consent_granted" || eventName === "consent_revoked" || eventName === "consent_updated";
  }

  function hasTelemetryConsent(eventName) {
    if (isConsentEvent(eventName)) {
      return true;
    }

    if (!consentRecord || !consentRecord.categories) {
      return false;
    }

    return !!consentRecord.categories.analytics_optional;
  }

  function emitTelemetry(eventName, data) {
    if (!telemetryConfig.enabled) {
      return;
    }

    if (!hasTelemetryConsent(eventName)) {
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

  var consentBanner = document.querySelector("[data-consent-banner]");
  var consentOpenButtons = document.querySelectorAll("[data-consent-open]");

  if (consentBanner) {
    var consentPanel = consentBanner.querySelector("[data-consent-panel]");
    var consentStatus = consentBanner.querySelector("[data-consent-status]");
    var analyticsCheckbox = consentBanner.querySelector('[data-consent-category="analytics_optional"]');
    var communicationCheckbox = consentBanner.querySelector('[data-consent-category="communication_optional"]');

    function setConsentPanelOpen(isOpen) {
      if (consentPanel instanceof HTMLElement) {
        consentPanel.hidden = !isOpen;
      }
    }

    function setConsentStatusText() {
      if (!(consentStatus instanceof HTMLElement)) {
        return;
      }

      if (!consentRecord || !consentRecord.categories) {
        consentStatus.textContent = "Status atual: preferencia ainda nao definida.";
        return;
      }

      var enabledCategories = [];
      if (consentRecord.categories.analytics_optional) {
        enabledCategories.push("analytics opcional");
      }
      if (consentRecord.categories.communication_optional) {
        enabledCategories.push("comunicacao opcional");
      }

      if (!enabledCategories.length) {
        consentStatus.textContent = "Status atual: opcionais revogados.";
        return;
      }

      consentStatus.textContent = "Status atual: " + enabledCategories.join(" e ") + " ativado(s).";
    }

    function syncConsentInputs() {
      if (analyticsCheckbox instanceof HTMLInputElement) {
        analyticsCheckbox.checked = !!(consentRecord && consentRecord.categories && consentRecord.categories.analytics_optional);
      }
      if (communicationCheckbox instanceof HTMLInputElement) {
        communicationCheckbox.checked = !!(consentRecord && consentRecord.categories && consentRecord.categories.communication_optional);
      }
    }

    function openConsentBanner() {
      consentBanner.hidden = false;
      setConsentPanelOpen(true);
      syncConsentInputs();
      setConsentStatusText();
    }

    function closeConsentBanner() {
      consentBanner.hidden = true;
      setConsentPanelOpen(false);
    }

    function applyConsentRecord(nextRecord, reason) {
      var hadAnalyticsConsent = !!(consentRecord && consentRecord.categories && consentRecord.categories.analytics_optional);
      consentRecord = nextRecord;
      writeConsentRecord(nextRecord);
      syncCookiesFromConsent(nextRecord);
      syncConsentInputs();
      setConsentStatusText();
      closeConsentBanner();

      var enabledCategories = [];
      if (nextRecord.categories.analytics_optional) {
        enabledCategories.push("analytics_optional");
      }
      if (nextRecord.categories.communication_optional) {
        enabledCategories.push("communication_optional");
      }

      emitTelemetry(nextRecord.status === "revoked" ? "consent_revoked" : "consent_granted", {
        channel: "banner",
        version: nextRecord.version,
        status: nextRecord.status,
        categories: enabledCategories,
        reason: reason || "manual_update",
        updated_at: nextRecord.updatedAt
      });

      emitTelemetry("consent_updated", {
        channel: "banner",
        version: nextRecord.version,
        status: nextRecord.status,
        categories: enabledCategories,
        reason: reason || "manual_update",
        updated_at: nextRecord.updatedAt
      });

      if (!hadAnalyticsConsent && nextRecord.categories.analytics_optional) {
        emitTelemetry("page_view", {
          title: document.title,
          trigger: "post_consent"
        });
      }
    }

    consentOpenButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        openConsentBanner();
      });
    });

    if (!consentRecord) {
      openConsentBanner();
    } else {
      syncConsentInputs();
      setConsentStatusText();
      closeConsentBanner();
    }

    consentBanner.addEventListener("click", function (event) {
      var target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      var action = target.getAttribute("data-consent-action");
      if (!action) {
        return;
      }

      if (action === "close") {
        closeConsentBanner();
        return;
      }

      if (action === "open-panel") {
        setConsentPanelOpen(true);
        return;
      }

      if (action === "accept-all") {
        applyConsentRecord(
          buildConsentRecord(
            {
              analytics_optional: true,
              communication_optional: true
            },
            "banner"
          ),
          "accept_all"
        );
        return;
      }

      if (action === "reject-optional" || action === "revoke") {
        applyConsentRecord(
          buildConsentRecord(
            {
              analytics_optional: false,
              communication_optional: false
            },
            "banner"
          ),
          action === "revoke" ? "revoke_optional" : "reject_optional"
        );
        return;
      }

      if (action === "save") {
        applyConsentRecord(
          buildConsentRecord(
            {
              analytics_optional: analyticsCheckbox instanceof HTMLInputElement ? analyticsCheckbox.checked : false,
              communication_optional: communicationCheckbox instanceof HTMLInputElement ? communicationCheckbox.checked : false
            },
            "banner"
          ),
          "save_preferences"
        );
      }
    });
  }

  var lookupForm = document.querySelector("[data-lookup-form]");
  var lookupResult = document.querySelector("[data-lookup-result]");
  var externalRegistrationLink = document.querySelector("[data-external-registration-link]");
  var guidanceCurrentRoot = document.querySelector("[data-guidance-current]");
  var guidanceHistoryRoot = document.querySelector("[data-guidance-history]");
  var guidanceCurrentMeta = document.querySelector("[data-guidance-current-meta]");
  var scheduleListRoot = document.querySelector("[data-schedule-list]");
  var scheduleSummaryRoot = document.querySelector("[data-schedule-summary]");
  var scheduleFilterNodes = document.querySelectorAll("[data-schedule-filter]");
  var speakerListRoot = document.querySelector("[data-speaker-list]");
  var faqListRoot = document.querySelector("[data-faq-list]");
  var policyCurrentRoot = document.querySelector("[data-policy-current]");
  var policyCurrentMeta = document.querySelector("[data-policy-current-meta]");
  var policyChangelogRoot = document.querySelector("[data-policy-changelog]");
  var termsCurrentRoot = document.querySelector("[data-terms-current]");
  var termsCurrentMeta = document.querySelector("[data-terms-current-meta]");
  var termsChangelogRoot = document.querySelector("[data-terms-changelog]");
  var apiConfig = appConfig.registrationApi || {};
  var registrationCore = window.ConectaRegistrationCore || {};
  var registrationGuidance = window.ConectaRegistrationGuidance || {};
  var scheduleData = window.ConectaScheduleData || {};
  var faqData = window.ConectaFaqData || {};
  var legalDocuments = window.ConectaLegalDocuments || {};

  if (externalRegistrationLink && apiConfig.externalRegistrationUrl) {
    externalRegistrationLink.setAttribute("href", apiConfig.externalRegistrationUrl);
  }

  function formatDateLabel(dateIso) {
    if (!dateIso) {
      return "Data nao informada";
    }

    try {
      var dateParts = String(dateIso).split("-");
      if (dateParts.length === 3) {
        return new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit",
          month: "long",
          year: "numeric"
        }).format(new Date(Date.UTC(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]), 12)));
      }

      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      }).format(new Date(dateIso));
    } catch (_error) {
      return dateIso;
    }
  }

  function sortSessionsByStartTime(left, right) {
    return String(left.startTime || "").localeCompare(String(right.startTime || ""));
  }

  function buildTrackOptions(sessions) {
    var select = document.querySelector('[data-schedule-filter="track"]');
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }

    var seenTracks = {};
    sessions
      .slice()
      .sort(function (left, right) {
        return String(left.track || "").localeCompare(String(right.track || ""));
      })
      .forEach(function (session) {
        var track = session.track || "Sem trilha";
        if (seenTracks[track]) {
          return;
        }

        seenTracks[track] = true;
        var option = document.createElement("option");
        option.value = track;
        option.textContent = track;
        select.appendChild(option);
      });
  }

  function createTimelineItem(session) {
    var article = document.createElement("article");
    article.className = "timeline-item";
    article.setAttribute("data-session-id", session.id || "unknown");

    var time = document.createElement("span");
    time.textContent = (session.startTime || "--:--") + " - " + (session.endTime || "--:--");
    article.appendChild(time);

    var content = document.createElement("div");
    var title = document.createElement("h2");
    title.textContent = session.title || "Sessao sem titulo";
    content.appendChild(title);

    var summary = document.createElement("p");
    summary.textContent = session.summary || "Resumo indisponivel.";
    content.appendChild(summary);

    var meta = document.createElement("p");
    meta.className = "timeline-meta";
    meta.textContent =
      "Trilha: " +
      (session.track || "Sem trilha") +
      " · Turno: " +
      (session.period || "na") +
      " · Formato: " +
      (session.format || "sessao") +
      " · Sala: " +
      (session.room || "a confirmar");
    content.appendChild(meta);

    article.appendChild(content);
    return article;
  }

  function getScheduleFilters() {
    var filters = {
      track: "all",
      period: "all"
    };

    scheduleFilterNodes.forEach(function (node) {
      if (!(node instanceof HTMLSelectElement)) {
        return;
      }
      var filterName = node.getAttribute("data-schedule-filter");
      if (!filterName) {
        return;
      }
      filters[filterName] = node.value || "all";
    });

    return filters;
  }

  function filterSessions(sessions, filters) {
    return sessions.filter(function (session) {
      if (filters.track !== "all" && session.track !== filters.track) {
        return false;
      }

      if (filters.period !== "all" && session.period !== filters.period) {
        return false;
      }

      return true;
    });
  }

  function updateScheduleSummary(filters, count) {
    if (!(scheduleSummaryRoot instanceof HTMLElement)) {
      return;
    }

    var parts = [count + (count === 1 ? " sessao exibida" : " sessoes exibidas")];
    if (filters.track !== "all") {
      parts.push("trilha " + filters.track);
    }
    if (filters.period !== "all") {
      parts.push("turno " + filters.period);
    }

    scheduleSummaryRoot.textContent = parts.join(" · ");
  }

  function renderScheduleAgenda() {
    if (!(scheduleListRoot instanceof HTMLElement)) {
      return;
    }

    var sessions = Array.isArray(scheduleData.sessions) ? scheduleData.sessions.slice().sort(sortSessionsByStartTime) : [];
    buildTrackOptions(sessions);

    function draw() {
      var filters = getScheduleFilters();
      var filteredSessions = filterSessions(sessions, filters);
      scheduleListRoot.textContent = "";

      if (!filteredSessions.length) {
        var empty = document.createElement("p");
        empty.className = "timeline-empty";
        empty.textContent = "Nenhuma sessao encontrada para os filtros selecionados.";
        scheduleListRoot.appendChild(empty);
        updateScheduleSummary(filters, 0);
        return;
      }

      filteredSessions.forEach(function (session) {
        scheduleListRoot.appendChild(createTimelineItem(session));
      });
      updateScheduleSummary(filters, filteredSessions.length);
    }

    scheduleFilterNodes.forEach(function (node) {
      node.addEventListener("change", draw);
    });

    draw();
  }

  renderScheduleAgenda();

  function renderSpeakerProfiles() {
    if (!(speakerListRoot instanceof HTMLElement)) {
      return;
    }

    var speakers = Array.isArray(scheduleData.speakers) ? scheduleData.speakers : [];
    speakerListRoot.textContent = "";

    if (!speakers.length) {
      var empty = document.createElement("p");
      empty.className = "guidance-loading";
      empty.textContent = "Perfis de palestrantes indisponiveis no momento.";
      speakerListRoot.appendChild(empty);
      return;
    }

    speakers.forEach(function (speaker) {
      var article = document.createElement("article");
      article.className = "speaker-card";
      article.setAttribute("data-speaker-id", speaker.id || "unknown");

      var name = document.createElement("h3");
      name.textContent = speaker.name || "Palestrante";
      article.appendChild(name);

      var institution = document.createElement("p");
      institution.className = "speaker-institution";
      institution.textContent = speaker.institution || "Instituicao nao informada";
      article.appendChild(institution);

      var area = document.createElement("p");
      area.className = "speaker-area";
      area.textContent = speaker.area || "Area nao informada";
      article.appendChild(area);

      var bio = document.createElement("p");
      bio.className = "speaker-bio";
      bio.textContent = speaker.bio || "Bio indisponivel.";
      article.appendChild(bio);

      if (Array.isArray(speaker.links) && speaker.links.length) {
        var links = document.createElement("div");
        links.className = "speaker-links";
        speaker.links.forEach(function (link) {
          if (!link || !link.url) {
            return;
          }

          var anchor = document.createElement("a");
          anchor.href = link.url;
          anchor.target = "_blank";
          anchor.rel = "noreferrer";
          anchor.textContent = link.label || "Link";
          anchor.setAttribute("data-track-click", "speaker_profile_link");
          links.appendChild(anchor);
        });
        article.appendChild(links);
      }

      speakerListRoot.appendChild(article);
    });
  }

  renderSpeakerProfiles();

  function renderFaqItems() {
    if (!(faqListRoot instanceof HTMLElement)) {
      return;
    }

    var items = Array.isArray(faqData.items) ? faqData.items : [];
    faqListRoot.textContent = "";

    if (!items.length) {
      var empty = document.createElement("p");
      empty.className = "guidance-loading";
      empty.textContent = "FAQ indisponivel no momento.";
      faqListRoot.appendChild(empty);
      return;
    }

    items.forEach(function (item) {
      var details = document.createElement("details");
      details.className = "faq-item";
      details.setAttribute("data-faq-id", item.id || "unknown");

      var summary = document.createElement("summary");

      var category = document.createElement("span");
      category.className = "faq-category";
      category.textContent = item.category || "FAQ";
      summary.appendChild(category);

      var question = document.createElement("span");
      question.className = "faq-question";
      question.textContent = item.question || "Pergunta frequente";
      summary.appendChild(question);

      details.appendChild(summary);

      var answer = document.createElement("p");
      answer.className = "faq-answer";
      answer.textContent = item.answer || "Resposta indisponivel.";
      details.appendChild(answer);

      faqListRoot.appendChild(details);
    });
  }

  renderFaqItems();

  function getPublishedLegalVersions(documentData) {
    return Array.isArray(documentData && documentData.versions)
      ? documentData.versions.filter(function (version) {
          return version && version.status === "published";
        })
      : [];
  }

  function findCurrentLegalVersion(documentData, publishedVersions) {
    if (!publishedVersions.length) {
      return null;
    }

    return (
      publishedVersions.find(function (version) {
        return version.id === documentData.currentVersionId;
      }) || publishedVersions[0]
    );
  }

  function createLegalChangelogCard(version) {
    var card = document.createElement("article");
    card.className = "legal-changelog-card";

    var heading = document.createElement("h3");
    heading.textContent = version.versionLabel || "Versao publicada";
    card.appendChild(heading);

    var meta = document.createElement("p");
    meta.className = "guidance-meta";
    meta.textContent = "Vigencia: " + formatDateLabel(version.effectiveFrom || version.publishedAt);
    card.appendChild(meta);

    if (Array.isArray(version.changes) && version.changes.length) {
      var list = document.createElement("ul");
      version.changes.forEach(function (change) {
        var item = document.createElement("li");
        item.textContent = change;
        list.appendChild(item);
      });
      card.appendChild(list);
    }

    return card;
  }

  function renderLegalDocument(documentData, currentRoot, metaRoot, changelogRoot, label) {
    if (!(currentRoot instanceof HTMLElement) || !(metaRoot instanceof HTMLElement) || !(changelogRoot instanceof HTMLElement)) {
      return;
    }

    var published = getPublishedLegalVersions(documentData);
    var currentVersion = findCurrentLegalVersion(documentData, published);

    if (!currentVersion) {
      currentRoot.textContent = "Documento indisponivel no momento.";
      changelogRoot.textContent = "Changelog indisponivel.";
      return;
    }

    metaRoot.textContent =
      "Versao vigente: " +
      (currentVersion.versionLabel || "N/A") +
      " · em vigor desde " +
      formatDateLabel(currentVersion.effectiveFrom || currentVersion.publishedAt);

    currentRoot.textContent = "";

    var heading = document.createElement("h2");
    heading.textContent = label + " vigente";
    currentRoot.appendChild(heading);

    var versionMeta = document.createElement("p");
    versionMeta.className = "legal-doc-meta";
    versionMeta.textContent =
      (currentVersion.versionLabel || "") +
      " · publicada em " +
      formatDateLabel(currentVersion.publishedAt || currentVersion.effectiveFrom);
    currentRoot.appendChild(versionMeta);

    var summary = document.createElement("p");
    summary.className = "legal-doc-summary";
    summary.textContent = currentVersion.summary || "Resumo indisponivel.";
    currentRoot.appendChild(summary);

    if (Array.isArray(currentVersion.highlights) && currentVersion.highlights.length) {
      var highlights = document.createElement("ul");
      highlights.className = "legal-doc-highlights";
      currentVersion.highlights.forEach(function (highlight) {
        var item = document.createElement("li");
        item.textContent = highlight;
        highlights.appendChild(item);
      });
      currentRoot.appendChild(highlights);
    }

    changelogRoot.textContent = "";
    published.forEach(function (version) {
      changelogRoot.appendChild(createLegalChangelogCard(version));
    });
  }

  renderLegalDocument(
    legalDocuments.privacyPolicy || {},
    policyCurrentRoot,
    policyCurrentMeta,
    policyChangelogRoot,
    "Politica de Privacidade"
  );

  renderLegalDocument(
    legalDocuments.termsOfUse || {},
    termsCurrentRoot,
    termsCurrentMeta,
    termsChangelogRoot,
    "Termo de Uso"
  );

  function appendTextList(root, title, items) {
    if (!(root instanceof HTMLElement) || !Array.isArray(items) || !items.length) {
      return;
    }

    var panel = document.createElement("div");
    panel.className = "guidance-panel";

    var heading = document.createElement("h3");
    heading.textContent = title;
    panel.appendChild(heading);

    var list = document.createElement("ul");
    items.forEach(function (item) {
      var listItem = document.createElement("li");
      listItem.textContent = item;
      list.appendChild(listItem);
    });

    panel.appendChild(list);
    root.appendChild(panel);
  }

  function renderVersionCard(version) {
    var article = document.createElement("article");
    article.className = "version-card";

    var title = document.createElement("h3");
    title.textContent = version.versionLabel + " · " + version.title;
    article.appendChild(title);

    var meta = document.createElement("p");
    meta.className = "guidance-meta";
    meta.textContent =
      "Publicada em " +
      formatDateLabel(version.publishedAt) +
      " por " +
      (version.author || "Equipe editorial") +
      ". Aprovacao: " +
      (version.approver || "Coordenacao");
    article.appendChild(meta);

    var summary = document.createElement("p");
    summary.textContent = version.summary || "Versao sem resumo editorial.";
    article.appendChild(summary);

    if (Array.isArray(version.changes) && version.changes.length) {
      var changesTitle = document.createElement("h3");
      changesTitle.textContent = "Principais ajustes";
      article.appendChild(changesTitle);

      var changesList = document.createElement("ul");
      version.changes.forEach(function (item) {
        var listItem = document.createElement("li");
        listItem.textContent = item;
        changesList.appendChild(listItem);
      });
      article.appendChild(changesList);
    }

    return article;
  }

  function renderRegistrationGuidance() {
    if (!(guidanceCurrentRoot instanceof HTMLElement)) {
      return null;
    }

    var versions = Array.isArray(registrationGuidance.versions)
      ? registrationGuidance.versions.filter(function (version) {
          return version && version.status === "published";
        })
      : [];

    if (!versions.length) {
      var emptyNode = guidanceCurrentRoot.querySelector(".guidance-loading");
      if (emptyNode) {
        emptyNode.textContent = "Nenhuma versao publicada disponivel no momento.";
      }
      if (guidanceHistoryRoot instanceof HTMLElement) {
        guidanceHistoryRoot.textContent = "Historico editorial indisponivel.";
      }
      return null;
    }

    var currentVersion = versions.find(function (version) {
      return version.id === registrationGuidance.currentVersionId;
    }) || versions[0];

    var loadingNode = guidanceCurrentRoot.querySelector(".guidance-loading");
    if (loadingNode) {
      loadingNode.remove();
    }

    var insertionTarget = externalRegistrationLink || null;

    var versionTitle = document.createElement("h3");
    versionTitle.textContent = currentVersion.title || "Versao publicada";
    guidanceCurrentRoot.insertBefore(versionTitle, insertionTarget);

    var meta = document.createElement("p");
    meta.className = "guidance-meta";
    meta.textContent =
      currentVersion.versionLabel +
      " · Publicada em " +
      formatDateLabel(currentVersion.publishedAt) +
      " · Autoria: " +
      (currentVersion.author || "Equipe editorial") +
      " · Aprovacao: " +
      (currentVersion.approver || "Coordenacao");
    guidanceCurrentRoot.insertBefore(meta, insertionTarget);

    var summary = document.createElement("p");
    summary.className = "guidance-summary";
    summary.textContent = currentVersion.summary || "Orientacoes oficiais publicadas.";
    guidanceCurrentRoot.insertBefore(summary, insertionTarget);

    var windowLine = document.createElement("p");
    windowLine.className = "guidance-window";
    windowLine.textContent =
      "Janela oficial: " +
      formatDateLabel(currentVersion.applicationWindow && currentVersion.applicationWindow.opensAt) +
      " a " +
      formatDateLabel(currentVersion.applicationWindow && currentVersion.applicationWindow.closesAt);
    guidanceCurrentRoot.insertBefore(windowLine, insertionTarget);

    var columns = document.createElement("div");
    columns.className = "guidance-columns";
    appendTextList(columns, "Criterios de elegibilidade", currentVersion.eligibility || []);
    appendTextList(columns, "Passo a passo oficial", currentVersion.steps || []);
    guidanceCurrentRoot.insertBefore(columns, insertionTarget);

    if (Array.isArray(currentVersion.changes) && currentVersion.changes.length) {
      var changesRoot = document.createElement("div");
      changesRoot.className = "guidance-grid";
      appendTextList(changesRoot, "O que mudou nesta versao", currentVersion.changes);
      guidanceCurrentRoot.insertBefore(changesRoot, insertionTarget);
    }

    if (currentVersion.support && (currentVersion.support.email || currentVersion.support.hours)) {
      var support = document.createElement("p");
      support.className = "guidance-support";
      support.textContent =
        "Suporte editorial: " +
        (currentVersion.support.email || "contato indisponivel") +
        " · Atendimento: " +
        (currentVersion.support.hours || "horario nao informado");
      guidanceCurrentRoot.insertBefore(support, insertionTarget);
    }

    if (guidanceCurrentMeta instanceof HTMLElement) {
      guidanceCurrentMeta.textContent =
        "Versao vigente: " +
        currentVersion.versionLabel +
        " · em vigor desde " +
        formatDateLabel(currentVersion.effectiveFrom || currentVersion.publishedAt);
    }

    if (guidanceHistoryRoot instanceof HTMLElement) {
      guidanceHistoryRoot.textContent = "";
      versions
        .filter(function (version) {
          return version.id !== currentVersion.id;
        })
        .forEach(function (version) {
          guidanceHistoryRoot.appendChild(renderVersionCard(version));
        });

      if (!guidanceHistoryRoot.children.length) {
        var emptyHistory = document.createElement("p");
        emptyHistory.className = "guidance-loading";
        emptyHistory.textContent = "Ainda nao ha versoes anteriores arquivadas.";
        guidanceHistoryRoot.appendChild(emptyHistory);
      }
    }

    return currentVersion;
  }

  var currentGuidanceVersion = renderRegistrationGuidance();

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
      page: "inscricoes",
      current_guidance_version: currentGuidanceVersion ? currentGuidanceVersion.id : "unknown"
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
