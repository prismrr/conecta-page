<script setup lang="ts">
import { storeToRefs } from "pinia";
import FaqGrid from "~/components/faq/FaqGrid.vue";

const faqStore = useFaqStore();
const { items } = storeToRefs(faqStore);
const { emitTelemetry } = useTelemetry();

onMounted(() => {
  emitTelemetry("faq_view", {
    total_items: items.value.length
  }).catch(() => {});
});
</script>

<template>
  <section class="grid faq-page">
    <article class="card page-head">
      <span class="badge">FAQ curada</span>
      <h1>Perguntas frequentes oficiais</h1>
      <p>
        Respostas consolidadas a partir do conteudo oficial ja publicado no
        portal para reduzir duvidas recorrentes e orientar a jornada do evento.
      </p>
    </article>

    <article class="card faq-shell">
      <div class="section-heading">
        <h2>Base inicial de respostas</h2>
        <p>
          Esta FAQ reune orientacoes de inscricao, agenda, escopo do evento e
          informacoes de privacidade publicadas nas paginas oficiais.
        </p>
      </div>

      <FaqGrid :items="items" />
    </article>
  </section>
</template>
