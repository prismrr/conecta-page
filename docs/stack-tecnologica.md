# Stack Tecnologica do Projeto

Este documento resume a stack adotada no Conecta PrismRR e o papel de cada tecnologia no sistema.

## Visao geral
- Tipo de aplicacao: site estatico com camadas operacionais locais para integracao, telemetria, compliance e observabilidade.
- Estilo de entrega: arquivos estaticos (HTML/CSS/JS) com suporte a testes automatizados, CI e deploy por ambiente.

## Frontend
- Nuxt 3 em modo SSG para a camada canônica de frontend.
- Vue 3 SFC para paginas, componentes e composables.
- Pinia para estado centralizado por dominio.

Arquivos de referencia:
- [nuxt-app](../nuxt-app)
- [nuxt-app/pages](../nuxt-app/pages)
- [nuxt-app/components](../nuxt-app/components)
- [nuxt-app/stores](../nuxt-app/stores)

Legado historico:
- [index.html](../index.html)
- [assets/css/styles.css](../assets/css/styles.css)
- [nuxt-app/plugins/telemetry.client.ts](../nuxt-app/plugins/telemetry.client.ts)
- [nuxt-app/nuxt.config.ts](../nuxt-app/nuxt.config.ts)

## Backend local e automacoes
- Python 3 para servidor de desenvolvimento e rotinas operacionais.
- Servidor HTTP local com endpoints de telemetria, compliance e monitoramento operacional.
- Jobs de compliance para retencao/descarte e simulacao de incidente.

Arquivos de referencia:
- [backend/fastapi_server.py](../backend/fastapi_server.py)
- [backend/jobs/retention_job.py](../backend/jobs/retention_job.py)
- [backend/jobs/incident_drill.py](../backend/jobs/incident_drill.py)

## Persistencia e dados
- SQLite como banco local de compliance e observabilidade operacional.
- NDJSON para logs locais de eventos de telemetria.

Artefatos usuais:
- `data/compliance.db`
- `logs/telemetry-events.ndjson`
- `logs/compliance-retention-report.json`
- `logs/compliance-incident-drill-report.json`

## Testes e qualidade
- Vitest para testes unitarios, de integracao, de contrato e de componente.
- Playwright para E2E, acessibilidade (axe-core) e regressao visual.
- Smoke test via shell script para validacao rapida de endpoints criticos.

Dependencias de teste principais:
- `vitest`
- `@playwright/test`
- `@axe-core/playwright`

Arquivos de referencia:
- [package.json](../package.json)
- [tests](../tests)
- [scripts/smoke_test.sh](../scripts/smoke_test.sh)

## Contratos e integracao externa
- OpenAPI para definicao e validacao do contrato de consulta de inscricao.
- Prism CLI para provider verification em testes de contrato.

Arquivos de referencia:
- [contracts/openapi/registration-result.v1.0.0.openapi.json](../contracts/openapi/registration-result.v1.0.0.openapi.json)
- [tests/contract/registration-provider-prism.contract.test.js](../tests/contract/registration-provider-prism.contract.test.js)

## Observabilidade
- Loki para persistencia e consulta de logs de telemetria.
- Grafana para exploracao e visualizacao.
- Docker Compose para subir stack local de observabilidade.

Arquivos de referencia:
- [infra/observability/docker-compose.yml](../infra/observability/docker-compose.yml)
- [infra/observability/loki/loki-config.yaml](../infra/observability/loki/loki-config.yaml)

## Seguranca e compliance no CI
- Semgrep para SAST.
- OSV Scanner para SCA.
- Gitleaks para secret scanning.
- OWASP ZAP Baseline para DAST.
- Workflows dedicados para rotinas LGPD (retencao e incident drill).

Arquivos de referencia:
- [.github/workflows/ci.yml](../.github/workflows/ci.yml)
- [.github/workflows/compliance-retention.yml](../.github/workflows/compliance-retention.yml)
- [.github/workflows/compliance-incident-drill.yml](../.github/workflows/compliance-incident-drill.yml)

## Entrega e deploy
- GitHub Actions para pipeline de deploy.
- Scripts shell para empacotamento estatico e publicacao por ambiente.
- Estrategia de release com manifest e resultado de deploy.

Arquivos de referencia:
- [.github/workflows/deploy.yml](../.github/workflows/deploy.yml)
- [backend/deploy/build_static.sh](../backend/deploy/build_static.sh)
- [backend/deploy/deploy_static.sh](../backend/deploy/deploy_static.sh)
- [backend/deploy/deploy_develop.sh](../backend/deploy/deploy_develop.sh)
- [backend/deploy/deploy_production.sh](../backend/deploy/deploy_production.sh)

## Ambiente de desenvolvimento
Comandos npm principais para o dia a dia:
- `npm run dev:docker`
- `npm run dev:docker:full`
- `npm run test`
- `npm run deploy:build`

Referencia:
- [package.json](../package.json)
- [README.md](../README.md)
