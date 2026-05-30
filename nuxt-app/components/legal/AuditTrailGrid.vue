<script setup lang="ts">
import type { ContentAuditEvent } from "~/data/content-audit-log";

defineProps<{
  events: ContentAuditEvent[];
}>();
</script>

<template>
  <div class="audit-grid" data-audit-list>
    <article v-for="event in events" :key="event.eventId" class="audit-card">
      <h3>{{ event.contentTitle }} · {{ event.version }}</h3>
      <p>Autor: {{ event.author }}</p>
      <p>Data: {{ new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(event.changedAt)) }}</p>
      <p>{{ event.changeSummary }}</p>
      <p>Protocolo: {{ event.eventId }}</p>
    </article>
  </div>
</template>
