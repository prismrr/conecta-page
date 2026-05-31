<script setup lang="ts">
import CookieConsentManager from "./components/privacy/CookieConsentManager.vue";
</script>

<template>
  <div class="app-shell">
    <LayoutHeader />
    <LayoutTopBanner />
    <main class="app-content container">
      <NuxtPage />
    </main>
    <LayoutFooter />
    <CookieConsentManager />
  </div>
</template>
