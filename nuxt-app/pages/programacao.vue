<script setup lang="ts">
import { storeToRefs } from "pinia";

const scheduleStore = useScheduleStore();
const { tracks, filteredSessions, summaryLabel, speakers, filters } = storeToRefs(scheduleStore);

const onTrackChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  scheduleStore.setTrack(target.value);
};

const onPeriodChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  scheduleStore.setPeriod(target.value as "all" | "manha" | "tarde");
};
</script>

<template>
  <section class="grid">
    <article class="card page-head">
      <span class="badge">Cronograma e palestrantes</span>
      <h1>Agenda tecnica do ciclo</h1>
      <p>
        Explore a agenda por trilha e turno para localizar rapidamente as
        sessoes mais relevantes para sua participacao.
      </p>
    </article>

    <article class="card schedule-shell">
      <div class="section-heading">
        <h2>Agenda com filtros</h2>
        <p>
          O cronograma e ordenado por horario e pode ser refinado por trilha
          e turno.
        </p>
      </div>

      <div class="schedule-filters" data-schedule-filters>
        <label class="filter-field">
          <span>Trilha</span>
          <select data-schedule-filter="track" :value="filters.track" @change="onTrackChange">
            <option value="all">Todas as trilhas</option>
            <option v-for="track in tracks" :key="track" :value="track">{{ track }}</option>
          </select>
        </label>

        <label class="filter-field">
          <span>Turno</span>
          <select data-schedule-filter="period" :value="filters.period" @change="onPeriodChange">
            <option value="all">Dia completo</option>
            <option value="manha">Manha</option>
            <option value="tarde">Tarde</option>
          </select>
        </label>
      </div>

      <p class="schedule-summary" data-schedule-summary>{{ summaryLabel }}</p>
      <ScheduleTimeline :sessions="filteredSessions" />
    </article>

    <article class="card speaker-shell">
      <div class="section-heading">
        <h2>Palestrantes convidados</h2>
        <p>
          Perfis com vinculacao institucional, area de atuacao e referencias
          para aprofundamento.
        </p>
      </div>

      <ScheduleSpeakerGrid :speakers="speakers" />
    </article>
  </section>
</template>

<style scoped>
.schedule-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.8rem;
}

.filter-field {
  display: grid;
  gap: 0.35rem;
  font-weight: 600;
}

.filter-field select {
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 0.45rem 0.6rem;
}

.schedule-summary {
  font-weight: 700;
}

.timeline {
  display: grid;
  gap: 0.65rem;
}

.timeline-item {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 0.8rem;
  display: grid;
  gap: 0.4rem;
}

.timeline-meta {
  color: #5e5e5e;
  font-size: 0.92rem;
}

.speaker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 0.8rem;
}

.speaker-card {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 0.85rem;
}

.speaker-links {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}
</style>
