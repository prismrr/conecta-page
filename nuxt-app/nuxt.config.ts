export default defineNuxtConfig({
  modules: ["@pinia/nuxt"],
  css: ["~/assets/css/main.css"],
  ssr: true,
  app: {
    head: {
      title: "Conecta PrismRR",
      htmlAttrs: {
        lang: "pt-BR"
      },
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "description", content: "Conecta PrismRR static-first experience powered by Nuxt 3 SSG." }
      ]
    }
  },
  runtimeConfig: {
    public: {
      registrationApiBase: "/api/registrations",
      registrationExternalUrl: "#",
      telemetryEnabled: true,
      telemetryEndpoint: "/telemetry/events",
      telemetryEnvironment: "development",
      telemetryReleaseId: "nuxt-migration-0.1.0",
      telemetrySourceChannel: "web",
      telemetryConsoleDebug: false,
      complianceApiBase: "/compliance",
      analyticsScriptSrc: "",
      marketingScriptSrc: ""
    }
  },
  nitro: {
    prerender: {
      routes: [
        "/",
        "/inscricoes",
        "/programacao",
        "/faq",
        "/politica-privacidade",
        "/termos-uso"
      ]
    }
  },
  routeRules: {
    "/**": { prerender: true }
  },
  compatibilityDate: "2026-05-30",
  devtools: { enabled: true },
  typescript: {
    strict: true,
    typeCheck: false
  }
});
