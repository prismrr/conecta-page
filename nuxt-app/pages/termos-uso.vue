<script setup lang="ts">
import { storeToRefs } from "pinia";
import LegalChangelogGrid from "~/components/legal/LegalChangelogGrid.vue";

const legalStore = useLegalStore();
const { currentTermsVersion, termsChangelog } = storeToRefs(legalStore);
const { emitTelemetry } = useTelemetry();

const formatDateLabel = (dateIso?: string) => legalStore.formatDateLabel(dateIso);

onMounted(() => {
  emitTelemetry("legal_document_view", {
    document: "terms_of_use",
    version: currentTermsVersion.value?.versionLabel || "unknown"
  }).catch(() => {});
});
</script>

<template>
  <section class="grid policy-page">
    <article class="card page-head">
      <span class="badge">Documento legal</span>
      <h1>Termos de Uso (versionados)</h1>
      <p class="page-version-note" data-terms-current-meta>
        Versao vigente: {{ currentTermsVersion?.versionLabel || "N/A" }} · em vigor desde
        {{ formatDateLabel(currentTermsVersion?.effectiveFrom) }}
      </p>
    </article>

    <article class="card" data-terms-current>
      <h2>Termo de Uso vigente</h2>
      <p>{{ currentTermsVersion?.summary || "Documento indisponivel no momento." }}</p>

      <ul v-if="currentTermsVersion?.highlights?.length">
        <li v-for="highlight in currentTermsVersion.highlights" :key="highlight">{{ highlight }}</li>
      </ul>
    </article>

    <article class="card">
      <div class="section-heading">
        <h2>Changelog dos termos</h2>
        <p>
          Alteracoes publicadas para acompanhamento de vigencia e clareza de
          regras de uso do portal.
        </p>
      </div>
      <LegalChangelogGrid :versions="termsChangelog" kind="terms" />
    </article>

    <article class="card">
      <h2>Relacao com politica de privacidade</h2>
      <p>
        O tratamento de dados e consentimento por categoria permanece descrito
        na Politica de Privacidade vigente.
      </p>
      <NuxtLink class="action-link" to="/politica-privacidade">Ver Politica de Privacidade</NuxtLink>
    </article>
  </section>
</template>

<style scoped>
.action-link {
  display: inline-flex;
  margin-top: 0.5rem;
  font-weight: 700;
}

.legal-changelog-grid {
  display: grid;
  gap: 0.7rem;
}

.legal-changelog-card {
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  padding: 0.75rem;
  background: #fff;
}
</style>
