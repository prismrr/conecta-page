<template>
  <section class="card hero">
    <span class="badge">Migration Wave 1</span>
    <h1>Portal Conecta em Nuxt 3</h1>
    <p>
      Esta versao inicial marca o inicio da migracao para arquitetura baseada em
      Single File Components, build estatico e estado centralizado.
    </p>
    <div class="grid grid-2">
      <NuxtLink class="card nav-card" to="/inscricoes">Inscricoes e Resultado</NuxtLink>
      <NuxtLink class="card nav-card" to="/programacao">Programacao e Palestrantes</NuxtLink>
      <NuxtLink class="card nav-card" to="/faq">Perguntas Frequentes</NuxtLink>
      <NuxtLink class="card nav-card" to="/politica-privacidade">Privacidade e DSAR</NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.hero h1 {
  margin: 0.5rem 0;
  font-size: clamp(1.8rem, 4vw, 2.5rem);
}

.hero p {
  color: #4f4f4f;
  max-width: 75ch;
}

.nav-card {
  display: block;
  text-decoration: none;
  font-weight: 700;
}
</style>
