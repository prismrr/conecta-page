<script setup lang="ts">
import type { FaqItem } from "~/data/faq-data";

defineProps<{
  items: FaqItem[];
}>();
</script>

<template>
  <div class="faq-grid" data-faq-list>
    <details v-for="item in items" :key="item.id" class="faq-item" :data-faq-id="item.id">
      <summary>
        <span class="faq-category">{{ item.category }}</span>
        <span class="faq-question">{{ item.question }}</span>
      </summary>
      <p class="faq-answer">{{ item.answer }}</p>
    </details>

    <p v-if="!items.length" class="guidance-loading">FAQ indisponivel no momento.</p>
  </div>
</template>

<style scoped>
.faq-grid {
  display: grid;
  gap: 0.7rem;
}

.faq-item {
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  padding: 0.4rem 0.7rem;
  background: #fff;
}

.faq-item summary {
  cursor: pointer;
  list-style: none;
  display: grid;
  gap: 0.3rem;
}

.faq-category {
  font-size: 0.8rem;
  font-weight: 700;
  color: #0f5f5b;
}

.faq-question {
  font-weight: 700;
}

.faq-answer {
  margin: 0.6rem 0 0.2rem;
  color: #444;
}
</style>
