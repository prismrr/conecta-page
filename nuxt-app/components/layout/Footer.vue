<template>
  <footer class="site-footer">
    <div class="container footer-row">
      <p>Conecta PrismRR · Nuxt 3 SSG migration track</p>
      <NuxtLink to="/politica-privacidade">Politica de Privacidade</NuxtLink>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.75);
}

.footer-row {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  color: #4e4e4e;
  font-size: 0.9rem;
}
</style>
