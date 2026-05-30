<script setup lang="ts">
const route = useRoute();
const isMenuOpen = ref(false);
const headerRef = ref<HTMLElement | null>(null);

const links = [
  { to: "/", label: "Inicio" },
  { to: "/inscricoes", label: "Inscricoes" },
  { to: "/programacao", label: "Programacao" },
  { to: "/faq", label: "FAQ" },
  { to: "/politica-privacidade", label: "Privacidade" },
  { to: "/termos-uso", label: "Termos" }
];

const closeMenu = () => {
  isMenuOpen.value = false;
};

const handleDocumentClick = (event: MouseEvent | TouchEvent) => {
  if (!isMenuOpen.value || !headerRef.value) {
    return;
  }

  const target = event.target;
  if (target instanceof Node && !headerRef.value.contains(target)) {
    closeMenu();
  }
};

const handleDocumentKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    closeMenu();
  }
};

watch(
  () => route.path,
  () => {
    closeMenu();
  }
);

onMounted(() => {
  document.addEventListener("mousedown", handleDocumentClick);
  document.addEventListener("touchstart", handleDocumentClick, { passive: true });
  document.addEventListener("keydown", handleDocumentKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("mousedown", handleDocumentClick);
  document.removeEventListener("touchstart", handleDocumentClick);
  document.removeEventListener("keydown", handleDocumentKeydown);
});
</script>

<template>
  <header ref="headerRef" class="site-header">
    <div class="container header-row">
      <NuxtLink to="/" class="brand">Conecta PrismRR</NuxtLink>
      <button
        type="button"
        class="menu-toggle"
        :aria-expanded="isMenuOpen ? 'true' : 'false'"
        aria-controls="primary-menu"
        aria-label="Abrir ou fechar menu de navegacao"
        @click="isMenuOpen = !isMenuOpen"
      >
        <span class="menu-toggle-line" />
        <span class="menu-toggle-line" />
        <span class="menu-toggle-line" />
      </button>
      <nav
        id="primary-menu"
        class="menu"
        :class="{ 'menu-open': isMenuOpen }"
        aria-label="Navegacao principal"
      >
        <NuxtLink
          v-for="item in links"
          :key="item.to"
          :to="item.to"
          class="menu-link"
          :class="{ active: route.path === item.to }"
          @click="closeMenu"
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

.menu-toggle {
  display: none;
  border: 1px solid rgba(40, 66, 64, 0.25);
  background: #ffffffc2;
  border-radius: 0.7rem;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0.45rem;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
}

.menu-toggle-line {
  display: block;
  width: 100%;
  height: 2px;
  background: #184746;
  border-radius: 2px;
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

@media (max-width: 860px) {
  .header-row {
    min-height: 64px;
    position: relative;
  }

  .menu-toggle {
    display: inline-flex;
  }

  .menu {
    position: absolute;
    top: calc(100% + 0.35rem);
    right: 0;
    left: auto;
    min-width: min(16rem, calc(100vw - 2rem));
    background: #fffefc;
    border: 1px solid rgba(40, 66, 64, 0.16);
    border-radius: 0.9rem;
    padding: 0.55rem;
    box-shadow: 0 16px 28px rgba(9, 37, 36, 0.16);
    display: none;
    flex-direction: column;
    gap: 0.25rem;
    z-index: 20;
  }

  .menu-open {
    display: flex;
  }

  .menu-link {
    display: block;
    width: 100%;
    padding: 0.55rem 0.8rem;
  }
}
</style>
