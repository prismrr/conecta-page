<script setup lang="ts">
import type { LegalVersion } from "~/data/legal-documents";

defineProps<{
  versions: LegalVersion[];
  kind: "policy" | "terms";
}>();
</script>

<template>
  <div class="legal-changelog-grid" :data-policy-changelog="kind === 'policy' ? '' : null" :data-terms-changelog="kind === 'terms' ? '' : null">
    <article v-for="version in versions" :key="version.id" class="legal-changelog-card">
      <h3>{{ version.versionLabel }}</h3>
      <p>Vigencia: {{ new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(version.effectiveFrom)) }}</p>
      <ul>
        <li v-for="change in version.changes" :key="change">{{ change }}</li>
      </ul>
    </article>
  </div>
</template>
