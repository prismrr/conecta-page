<script setup lang="ts">
import type { LegalVersion } from "~/data/legal-documents";

defineProps<{
  heading: string;
  currentVersion: LegalVersion | null;
  metaDataAttr: string;
  rootDataAttr: string;
}>();
</script>

<template>
  <section class="card">
    <p class="page-version-note" :data-policy-current-meta="metaDataAttr === 'data-policy-current-meta' ? '' : null" :data-terms-current-meta="metaDataAttr === 'data-terms-current-meta' ? '' : null">
      Versao vigente: {{ currentVersion?.versionLabel || "N/A" }} · em vigor desde
      {{ currentVersion ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(currentVersion.effectiveFrom)) : "N/A" }}
    </p>
  </section>

  <section class="card" :data-policy-current="rootDataAttr === 'data-policy-current' ? '' : null" :data-terms-current="rootDataAttr === 'data-terms-current' ? '' : null">
    <h2>{{ heading }}</h2>
    <p>{{ currentVersion?.summary || "Documento indisponivel no momento." }}</p>

    <ul v-if="currentVersion?.highlights?.length">
      <li v-for="item in currentVersion.highlights" :key="item">{{ item }}</li>
    </ul>
  </section>
</template>
