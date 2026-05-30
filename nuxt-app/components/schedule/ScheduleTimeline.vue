<script setup lang="ts">
import type { ScheduleSession } from "~/data/schedule-data";

defineProps<{
  sessions: ScheduleSession[];
}>();
</script>

<template>
  <section class="timeline" data-schedule-list>
    <article v-for="session in sessions" :key="session.id" class="timeline-item" :data-session-id="session.id">
      <span>{{ session.startTime }} - {{ session.endTime }}</span>
      <div>
        <h2>{{ session.title }}</h2>
        <p>{{ session.summary }}</p>
        <p class="timeline-meta">
          Trilha: {{ session.track }} · Turno: {{ session.period }} · Formato: {{ session.format }} · Sala: {{ session.room }}
        </p>
      </div>
    </article>

    <p v-if="!sessions.length" class="timeline-empty">Nenhuma sessao encontrada para os filtros selecionados.</p>
  </section>
</template>
