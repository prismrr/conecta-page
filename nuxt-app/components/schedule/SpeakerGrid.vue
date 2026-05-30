<script setup lang="ts">
import type { SpeakerProfile } from "~/data/schedule-data";

defineProps<{
  speakers: SpeakerProfile[];
}>();
</script>

<template>
  <section class="speaker-grid" data-speaker-list>
    <article v-for="speaker in speakers" :key="speaker.id" class="speaker-card" :data-speaker-id="speaker.id">
      <h3>{{ speaker.name }}</h3>
      <p class="speaker-institution">{{ speaker.institution }}</p>
      <p class="speaker-area">{{ speaker.area }}</p>
      <p class="speaker-bio">{{ speaker.bio }}</p>

      <div v-if="speaker.links.length" class="speaker-links">
        <a
          v-for="link in speaker.links"
          :key="`${speaker.id}-${link.url}`"
          :href="link.url"
          target="_blank"
          rel="noreferrer"
        >
          {{ link.label }}
        </a>
      </div>
    </article>

    <p v-if="!speakers.length" class="guidance-loading">Perfis de palestrantes indisponiveis no momento.</p>
  </section>
</template>
