<script setup lang="ts">
import { registrationGuidanceData } from "~/data/registration-guidance";

const {
  apiConfig,
  monitor,
  lookupInput,
  lookupResult,
  isLoading,
  providerStatusLabel,
  providerMetaLabel,
  submitLookup,
  loadSummary
} = useRegistrationLookup();

const publishedVersions = computed(() =>
  registrationGuidanceData.versions.filter((version) => version.status === "published")
);

const currentGuidanceVersion = computed(
  () =>
    publishedVersions.value.find((version) => version.id === registrationGuidanceData.currentVersionId) ||
    publishedVersions.value[0] ||
    null
);

const historyVersions = computed(() =>
  publishedVersions.value.filter((version) => version.id !== currentGuidanceVersion.value?.id)
);

onMounted(async () => {
  await loadSummary();
});

const handleSubmit = async () => {
  await submitLookup();
};

const formatDateLabel = (dateIso?: string) => {
  if (!dateIso) {
    return "Data nao informada";
  }

  const dateParts = String(dateIso).split("-");
  if (dateParts.length === 3) {
    const normalizedDate = new Date(Date.UTC(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]), 12));
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(normalizedDate);
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(dateIso));
};
</script>

<template>
  <section class="grid">
    <article class="card">
      <span class="badge">Inscricoes</span>
      <h1>Orientacoes e resultado</h1>
      <p>
        Esta pagina centraliza criterios, prazos e o acesso ao resultado das
        inscricoes enviadas em sistema externo.
      </p>
      <p data-guidance-current-meta>
        Versao vigente: {{ currentGuidanceVersion?.versionLabel || "N/A" }}
      </p>
    </article>

    <article class="card" data-guidance-current>
      <h2>{{ currentGuidanceVersion?.title || "Como se inscrever" }}</h2>
      <p>{{ currentGuidanceVersion?.summary || "Orientacoes indisponiveis no momento." }}</p>

      <p v-if="currentGuidanceVersion?.applicationWindow" class="guidance-window">
        Janela de inscricao: {{ formatDateLabel(currentGuidanceVersion.applicationWindow.opensAt) }} ate
        {{ formatDateLabel(currentGuidanceVersion.applicationWindow.closesAt) }}
      </p>

      <div class="grid grid-2">
        <div class="card compact" v-if="currentGuidanceVersion?.eligibility?.length">
          <h3>Elegibilidade</h3>
          <ul>
            <li v-for="item in currentGuidanceVersion.eligibility" :key="item">{{ item }}</li>
          </ul>
        </div>
        <div class="card compact" v-if="currentGuidanceVersion?.steps?.length">
          <h3>Fluxo recomendado</h3>
          <ol>
            <li v-for="step in currentGuidanceVersion.steps" :key="step">{{ step }}</li>
          </ol>
        </div>
      </div>

      <a class="action-link" :href="apiConfig.externalRegistrationUrl" target="_blank" rel="noreferrer" data-external-registration-link>
        Ir para sistema de inscricao externo
      </a>
    </article>

    <article class="card" data-guidance-history-section>
      <h2>Historico de versoes publicadas</h2>
      <div class="grid grid-2" data-guidance-history>
        <div v-for="version in historyVersions" :key="version.id" class="card compact">
          <h3>{{ version.versionLabel }} · {{ version.title }}</h3>
          <p>
            Publicada em {{ formatDateLabel(version.publishedAt) }} · Vigencia {{ formatDateLabel(version.effectiveFrom) }}
          </p>
          <ul v-if="version.changes?.length">
            <li v-for="change in version.changes" :key="change">{{ change }}</li>
          </ul>
        </div>
      </div>
    </article>

    <article class="card">
      <h2>Consultar resultado (integracao API)</h2>
      <p>
        Informe o codigo da inscricao para consultar o resultado oficial no
        sistema externo integrado.
      </p>

      <form class="lookup-form" data-lookup-form @submit.prevent="handleSubmit">
        <label for="inscricaoId">Codigo da inscricao</label>
        <input
          id="inscricaoId"
          v-model="lookupInput"
          name="inscricaoId"
          type="text"
          placeholder="EX: PRISM-2026-001"
          required
        />
        <button class="submit-btn" type="submit" :disabled="isLoading">
          {{ isLoading ? "Consultando..." : "Consultar" }}
        </button>
      </form>

      <p class="lookup-result" data-lookup-result role="status">{{ lookupResult }}</p>
      <p>
        Em caso de indisponibilidade da API, o sistema exibira modo degradado
        com orientacao de suporte.
      </p>
    </article>

    <RegistrationIntegrationMonitorCard
      :signal="monitor.signal"
      :status-label="providerStatusLabel"
      :provider-meta-label="providerMetaLabel"
      :total="monitor.total"
      :available="monitor.available"
      :failures="monitor.failures"
      :degraded="monitor.degraded"
    />
  </section>
</template>

<style scoped>
.compact {
  padding: 0.9rem;
}

.compact h3 {
  margin: 0 0 0.4rem;
}

.action-link {
  display: inline-flex;
  margin-top: 0.8rem;
  font-weight: 700;
}

.lookup-form {
  display: grid;
  gap: 0.6rem;
}

.lookup-form input {
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
}

.submit-btn {
  justify-self: start;
  border: 0;
  border-radius: 999px;
  background: #0f5f5b;
  color: #fff;
  padding: 0.5rem 1rem;
  font-weight: 700;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.lookup-result {
  min-height: 1.25rem;
  font-weight: 700;
}

.guidance-window {
  font-weight: 700;
}
</style>
