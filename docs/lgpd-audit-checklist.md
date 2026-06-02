# Checklist de Adequacao LGPD

Este documento transforma o inventario de dados e os controles existentes em uma sequencia de auditoria executavel.
Base operacional:
- [docs/privacy-data-map.json](privacy-data-map.json)
- [logs/privacy-data-report.md](../logs/privacy-data-report.md)
- [backend/fastapi_server.py](../backend/fastapi_server.py)
- [nuxt-app/stores/consent.ts](../nuxt-app/stores/consent.ts)
- [nuxt-app/stores/dsar.ts](../nuxt-app/stores/dsar.ts)

## Milestone 1: Diagnostico e Data Mapping

Objetivo:
- Consolidar o inventario de superficies, campos, finalidade, base legal, armazenamento e retencao.

Checklist:
- [x] Mapear consentimento, DSAR, telemetria, integracao externa, auditoria de conteudo, alertas e artefatos de CI.
- [x] Classificar cada superficie como dado pessoal, pseudonimo, operacional ou nao pessoal.
- [x] Registrar categorias sensiveis proibidas: CPF, biometria, saude, origem racial/etnica.
- [x] Vincular cada superficie a uma base legal e a uma politica de retencao.

Impacto na arquitetura:
- Inventario LGPD em [docs/privacy-data-map.json](privacy-data-map.json).
- Gate de validacao em [scripts/privacy_inventory_check.js](../scripts/privacy_inventory_check.js).

Validacao:
- `npm run compliance:privacy:inventory`
- `npm run test:integration -- tests/integration/inventory-governance.integration.test.js`
- relatorio gerado em `logs/privacy-data-report.md` e `logs/privacy-data-report.json`

Observacao operacional:
- o gate de privacidade aceita override de caminhos para validacao em ambiente isolado:
	- `CONECTA_PRIVACY_INVENTORY_PATH`
	- `CONECTA_PRIVACY_REPORT_DIR`
	- `CONECTA_PRIVACY_REPORT_JSON_PATH`
	- `CONECTA_PRIVACY_REPORT_MD_PATH`

Evidencia esperada:
- artifact `privacy-inventory-report-ci`

## Milestone 2: Engenharia de Minimizacao e Persistencia Segura

Objetivo:
- Reduzir o volume de dados persistidos e impedir exposicao desnecessaria em logs, traces e snapshots.

Checklist:
- [x] Manter DSAR sem persistir e-mail ou dados extras no local storage.
- [x] Limitar telemetria a campos operacionais, pseudonimos e contexto minimo.
- [x] Redigir artifacts de CI considerados sensiveis.
- [x] Evitar credenciais embutidas em URLs de forwarding.

Impacto na arquitetura:
- [nuxt-app/composables/useTelemetry.ts](../nuxt-app/composables/useTelemetry.ts)
- [backend/fastapi_server.py](../backend/fastapi_server.py)
- [logs/](../logs/)

Validacao:
- `npm run test:unit -- tests/unit/privacy-data-map.test.js`
- `npm run compliance:privacy:inventory`

## Milestone 3: Consentimento, Cookies e Transparencia

Objetivo:
- Garantir opt-in granular, versionado e revogavel para qualquer processamento nao essencial.

Checklist:
- [x] Preservar categorias `analytics_optional` e `marketing_optional` separadas de `essential`.
- [x] Bloquear emissao de eventos nao essenciais sem consentimento ativo.
- [x] Persistir consentimento com versao, status e timestamp.
- [x] Manter trilha auditavel para grant/revoke/update.

Impacto na arquitetura:
- [nuxt-app/stores/consent.ts](../nuxt-app/stores/consent.ts)
- [nuxt-app/plugins/telemetry.client.ts](../nuxt-app/plugins/telemetry.client.ts)

Validacao:
- `npm run test:e2e:nuxt:consent`
- `npm run test:unit -- tests/unit/nuxt-telemetry.test.js`

## Milestone 4: Direitos do Titular

Objetivo:
- Sustentar acesso, correcao, eliminacao, portabilidade e revogacao com protocolo e evidencia.

Checklist:
- [x] Gerar protocolo DSAR com formato controlado.
- [x] Evitar persistir contato do titular no historico local.
- [x] Registrar estado da solicitacao e canal de origem.
- [x] Implementar exportacao minimizada e exclusao segura do artefato temporario.

Impacto na arquitetura:
- [nuxt-app/stores/dsar.ts](../nuxt-app/stores/dsar.ts)
- [nuxt-app/components/legal/DsarRequestForm.vue](../nuxt-app/components/legal/DsarRequestForm.vue)
- [docs/api.md](api.md)
- [backend/fastapi_server.py](../backend/fastapi_server.py)

Validacao:
- `npm run test:e2e -- tests/e2e/nuxt/dsar-channel.nuxt.spec.js`
- `npm run test:integration -- tests/integration/dev-server.integration.test.js`

## Milestone 5: Retencao, Auditoria e Incidentes

Objetivo:
- Tornar descarte, trilha append-only e resposta a incidente observaveis e auditaveis.

Checklist:
- [x] Aplicar politica de retencao para consentimento, integracao, telemetria e alertas.
- [x] Manter drill de incidente com simulacao controlada e evidencias.
- [x] Manter inventario de trilhas append-only de auditoria de conteudo.
- [x] Publicar relatorios de retencao e incidente em workflows agendados.

Impacto na arquitetura:
- [backend/jobs/retention_job.py](../backend/jobs/retention_job.py)
- [backend/jobs/incident_drill.py](../backend/jobs/incident_drill.py)
- [.github/workflows/compliance-retention.yml](../.github/workflows/compliance-retention.yml)
- [.github/workflows/compliance-incident-drill.yml](../.github/workflows/compliance-incident-drill.yml)

Validacao:
- `npm run compliance:retention:dry-run`
- `npm run compliance:incident:drill:observe`

## Milestone 6: Governanca Continua e CI/AppSec

Objetivo:
- Tratar LGPD como gate permanente no pipeline, com relatorio, artifact e bloqueio automatico.

Checklist:
- [x] Executar gate de inventario LGPD antes da suite principal.
- [x] Publicar artifact de auditoria do inventario no GitHub Actions.
- [x] Manter SAST, SCA, DAST e testes de contrato no fluxo de CI.
- [x] Manter artifact de incident drill e de testes Playwright para rastreabilidade.

Impacto na arquitetura:
- [.github/workflows/ci.yml](../.github/workflows/ci.yml)
- [package.json](../package.json)

Validacao:
- `npm run compliance:privacy:inventory`
- `npm run build:ci`

## Milestone 7: Endurecimento Operacional e Terceiros

Objetivo:
- Fechar as camadas de seguranca e governanca que ainda merecem formalizacao operacional recorrente.

Checklist:
- [ ] Formalizar RBAC/MFA para superficies administrativas e rotas sensiveis de operacao.
- [x] Manter catalogo de terceiros com finalidade, base legal, escopo de dados, retencao e salvaguardas de transferencia.
- [ ] Validar criptografia em repouso, gestao de chaves e evidencia de rotacao/segregacao de ambientes.
- [x] Executar testes periodicos de backup e restauracao com relatorio de sucesso.
- [ ] Manter versao publica, changelog e contato de privacidade sincronizados com os documentos legais.
- [ ] Consolidar evidencias periodicas de gestao de vulnerabilidades e revisao de controles tecnicos.

Impacto na arquitetura:
- [docs/third-party-registry.json](../docs/third-party-registry.json)
- [.SPECS/ldpg_design.md](../.SPECS/ldpg_design.md)
- [backend/](../backend)
- [docs/](../docs)
- [.github/workflows/](../.github/workflows)

Validacao:
- `npm run compliance:third-party:inventory`
- `npm run test:integration -- tests/integration/inventory-governance.integration.test.js`
- `npm run compliance:backup:restore`
- `npm run build:ci`
- `npm run compliance:retention:dry-run`
- `npm run compliance:incident:drill:observe`

Observacao operacional:
- o gate de terceiros aceita override de caminhos para validacao em ambiente isolado:
	- `CONECTA_THIRD_PARTY_REGISTRY_PATH`
	- `CONECTA_THIRD_PARTY_REPORT_DIR`
	- `CONECTA_THIRD_PARTY_REPORT_JSON_PATH`
	- `CONECTA_THIRD_PARTY_REPORT_MD_PATH`

## Criterios de auditoria final

- Nenhuma superficie possui categoria sensivel nao autorizada.
- Todos os dados pessoais possuem finalidade, base legal e retencao declaradas.
- DSAR, consentimento e telemetria sao minimizados e auditaveis.
- Artefatos de CI e logs de diagnostico sao tratados como potenciais evidencias sensiveis.
- Relatorios de inventario, retencao e incidente estao disponiveis para revisao.
