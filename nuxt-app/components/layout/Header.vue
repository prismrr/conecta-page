<script setup lang="ts">
const route = useRoute();

const links = [
  { to: "/", label: "Inicio" },
  { to: "/inscricoes", label: "Inscricoes" },
  { to: "/programacao", label: "Programacao" },
  { to: "/faq", label: "FAQ" },
  { to: "/politica-privacidade", label: "Privacidade" },
  { to: "/termos-uso", label: "Termos" }
];
</script>

<template>
  <header class="site-header">
    <div class="container header-row">
      <NuxtLink to="/" class="brand">Conecta PrismRR</NuxtLink>
      <nav class="menu" aria-label="Navegacao principal">
        <NuxtLink
          v-for="item in links"
          :key="item.to"
          :to="item.to"
          class="menu-link"
          :class="{ active: route.path === item.to }"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(6px);
  background: rgba(247, 245, 239, 0.85);
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-row {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.brand {
  font-size: 1.15rem;
  font-weight: 800;
  color: #0a3d3a;
  text-decoration: none;
}

.menu {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.menu-link {
  text-decoration: none;
  color: #284240;
  border-radius: 999px;
  padding: 0.35rem 0.8rem;
  font-size: 0.92rem;
}

.menu-link.active,
.menu-link:hover {
  background: #d8eeec;
}
</style>
