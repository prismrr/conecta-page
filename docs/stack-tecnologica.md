# Stack Tecnologica do Projeto

Este documento resume a stack adotada no Conecta PrismRR e o papel de cada tecnologia no sistema.

## Visao geral
- Tipo de aplicacao: site estatico com camadas operacionais locais para integracao, telemetria, compliance e observabilidade.
- Estilo de entrega: arquivos estaticos (HTML/CSS/JS) com suporte a testes automatizados, CI e deploy por ambiente.

## Frontend
- HTML5 para estrutura das paginas institucionais e fluxos principais.
- CSS3 para estilizacao.
- JavaScript (vanilla) para interacoes, regras de interface e integracao com endpoints locais.

Arquivos de referencia:
- [index.html](../index.html)
- [assets/css/styles.css](../assets/css/styles.css)
- [assets/js/site.js](../assets/js/site.js)
- [assets/js/config.js](../assets/js/config.js)

## Backend local e automacoes
- Python 3 para servidor de desenvolvimento e rotinas operacionais.
- Servidor HTTP local com endpoints de telemetria, compliance e monitoramento operacional.
- Jobs de compliance para retencao/descarte e simulacao de incidente.

Arquivos de referencia:
- [scripts/dev_server.py](../scripts/dev_server.py)
- [scripts/retention_job.py](../scripts/retention_job.py)
- [scripts/incident_drill.py](../scripts/incident_drill.py)

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
- [ops/observability/docker-compose.yml](../ops/observability/docker-compose.yml)
- [ops/observability/loki/loki-config.yaml](../ops/observability/loki/loki-config.yaml)

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
- [scripts/deploy/build_static.sh](../scripts/deploy/build_static.sh)
- [scripts/deploy/deploy_static.sh](../scripts/deploy/deploy_static.sh)
- [scripts/deploy/deploy_develop.sh](../scripts/deploy/deploy_develop.sh)
- [scripts/deploy/deploy_production.sh](../scripts/deploy/deploy_production.sh)

## Ambiente de desenvolvimento
Comandos npm principais para o dia a dia:
- `npm run dev:docker`
- `npm run dev:docker:full`
- `npm run test`
- `npm run deploy:build`

Referencia:
- [package.json](../package.json)
- [README.md](../README.md)
