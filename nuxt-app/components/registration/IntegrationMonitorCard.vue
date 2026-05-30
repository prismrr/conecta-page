<script setup lang="ts">
defineProps<{
  signal: "unknown" | "available" | "degraded" | "unavailable";
  statusLabel: string;
  providerMetaLabel: string;
  total: number;
  available: number;
  failures: number;
  degraded: number;
}>();
</script>

<template>
  <article class="card monitor-card" data-integration-monitor>
    <h2>Monitoramento operacional da integracao</h2>
    <p class="monitor-status-line" role="status" data-provider-status-line>
      <span class="monitor-signal" :class="`monitor-signal-${signal}`" data-provider-signal aria-hidden="true"></span>
      <strong data-provider-status>{{ statusLabel }}</strong>
    </p>

    <dl class="monitor-summary-grid">
      <div>
        <dt>Consultas</dt>
        <dd data-monitor-total>{{ total }}</dd>
      </div>
      <div>
        <dt>Respostas disponiveis</dt>
        <dd data-monitor-available>{{ available }}</dd>
      </div>
      <div>
        <dt>Falhas do provider</dt>
        <dd data-monitor-failures>{{ failures }}</dd>
      </div>
      <div>
        <dt>Modo degradado</dt>
        <dd data-monitor-degraded>{{ degraded }}</dd>
      </div>
    </dl>

    <p data-provider-meta>
      {{ providerMetaLabel }}
    </p>
  </article>
</template>

<style scoped>
.monitor-status-line {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.monitor-signal {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #8d8d8d;
}

.monitor-signal-available {
  background: #20894b;
}

.monitor-signal-degraded {
  background: #cf8a00;
}

.monitor-signal-unavailable {
  background: #bb2f2f;
}

.monitor-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.6rem;
}

.monitor-summary-grid dt {
  font-size: 0.85rem;
  color: #555;
}

.monitor-summary-grid dd {
  margin: 0.2rem 0 0;
  font-size: 1.1rem;
  font-weight: 800;
}
</style>
