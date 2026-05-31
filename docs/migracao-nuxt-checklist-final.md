# Checklist Final de Migracao para Nuxt 3 (SSG)

Status geral: concluido com hardening de contratos, observabilidade e conformidade.

## Escopo e invariantes
- [x] Renderizacao em Nuxt 3 mantida em modo SSG.
- [x] Componentizacao em SFC aplicada nas paginas migradas.
- [x] Estado centralizado com Pinia para dominios principais.
- [x] Fluxos legados permanecem disponiveis durante transicao controlada.

## Hardening de contratos
- [x] Validacao de contrato OpenAPI para integracao de inscricoes em testes de contrato.
- [x] Provider verification com Prism para detectar breaking changes.
- [x] Validacao de contrato no coletor de telemetria para rejeitar payload invalido antes de persistir.
- [x] Validacoes negativas adicionadas para:
  - payload de telemetria invalido
  - status de consentimento invalido

Evidencias de implementacao:
- [backend/fastapi_server.py](../backend/fastapi_server.py)
- [tests/contract/registration-openapi.contract.test.js](../tests/contract/registration-openapi.contract.test.js)
- [tests/contract/registration-provider-prism.contract.test.js](../tests/contract/registration-provider-prism.contract.test.js)
- [tests/integration/dev-server.integration.test.js](../tests/integration/dev-server.integration.test.js)

## Hardening de observabilidade e compliance
- [x] Telemetria Nuxt centralizada com gating por consentimento (analytics_optional).
- [x] Eventos de consentimento mantidos como auditaveis mesmo sem opt-in de analytics.
- [x] Sincronizacao de consentimento para endpoint de compliance.
- [x] Emissao de evento de falha operacional quando sincronizacao de consentimento falha (`external_data_sync_failed`).
- [x] Correlacao por release/environment/source_channel no payload.

Evidencias de implementacao:
- [nuxt-app/composables/useTelemetry.ts](../nuxt-app/composables/useTelemetry.ts)
- [nuxt-app/plugins/telemetry.client.ts](../nuxt-app/plugins/telemetry.client.ts)
- [nuxt-app/nuxt.config.ts](../nuxt-app/nuxt.config.ts)
- [tests/unit/nuxt-telemetry.test.js](../tests/unit/nuxt-telemetry.test.js)

## Cobertura de testes de migracao (Nuxt)
- [x] Unit: stores e composables principais.
- [x] Component: componentes de inscricoes, programacao, faq e legal.
- [x] E2E Nuxt: inscricoes, programacao, faq, legal-versioning, dsar e audit.
- [x] SSG build (`nuxt generate`) validado.

Suites de referencia:
- [tests/unit](../tests/unit)
- [tests/component/nuxt](../tests/component/nuxt)
- [tests/e2e/nuxt](../tests/e2e/nuxt)

## Rastreabilidade (PRD e LGPD)
Mapeamento de itens de entrega para requisitos relevantes:
- Telemetria e saude operacional: PRD-RQ10.
- Consentimento granular, versionado e revogavel: PRD-RQ06, PRD-RQ07, PRD-RQ11.
- Trilha de auditoria e DSAR: PRD-RQ08, PRD-RQ09.
- Qualidade e resiliencia de entrega: PRD-RQ12.

Fontes normativas:
- [/.SPECS/PRD.md](../.SPECS/PRD.md)
- [/.SPECS/test_design.md](../.SPECS/test_design.md)
- [/.SPECS/ldpg_design.md](../.SPECS/ldpg_design.md)
- [/.github/instructions/testing.instructions.md](../.github/instructions/testing.instructions.md)
- [/.github/instructions/compliance.instructions.md](../.github/instructions/compliance.instructions.md)

## Go/No-Go
- [x] Contratos criticos protegidos por testes e validacoes negativas.
- [x] Observabilidade com sinais de falha operacional e correlacao por release.
- [x] Compliance com gating por consentimento e auditoria de alteracoes.
- [x] Build SSG valido para entrega estatica.

Decisao recomendada: GO para consolidacao da trilha Nuxt como baseline do frontend SSG.
