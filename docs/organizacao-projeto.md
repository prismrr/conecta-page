# Organizacao do Projeto (Frontend x Backend)

Este documento descreve a organizacao adotada para separar responsabilidades de frontend e backend, mantendo compatibilidade com automacoes legadas.

## Objetivo da reorganizacao
- Diferenciar claramente camada de interface (frontend) e camada de servicos/processamento (backend).
- Reduzir acoplamento entre arquivos de UI e scripts operacionais.
- Preservar compatibilidade com comandos existentes em CI/CD e desenvolvimento local.
- Tratar o frontend legado somente como referencia historica.

## Estrutura adotada

Frontend (interface e experiencia):
- [nuxt-app](../nuxt-app)
- [nuxt-app/pages](../nuxt-app/pages)
- [nuxt-app/components](../nuxt-app/components)
- [nuxt-app/stores](../nuxt-app/stores)
- [frontend/README.md](../frontend/README.md)
- [index.html](../index.html)
- [pages](../pages)
- [assets](../assets)

Backend (servicos e operacao):
- [backend/README.md](../backend/README.md)
- [backend/fastapi_server.py](../backend/fastapi_server.py)
- [backend/jobs/retention_job.py](../backend/jobs/retention_job.py)
- [backend/jobs/incident_drill.py](../backend/jobs/incident_drill.py)
- [backend/deploy/build_static.sh](../backend/deploy/build_static.sh)
- [backend/deploy/deploy_static.sh](../backend/deploy/deploy_static.sh)
- [backend/deploy/deploy_develop.sh](../backend/deploy/deploy_develop.sh)
- [backend/deploy/deploy_production.sh](../backend/deploy/deploy_production.sh)

Infraestrutura (stack local e runtime support):
- [infra/observability/docker-compose.yml](../infra/observability/docker-compose.yml)
- [infra/observability/loki/loki-config.yaml](../infra/observability/loki/loki-config.yaml)
- [infra/observability/grafana/provisioning/datasources/loki.yaml](../infra/observability/grafana/provisioning/datasources/loki.yaml)

Compatibilidade legada:
- [scripts/dev_docker.sh](../scripts/dev_docker.sh)
- [scripts/retention_job.py](../scripts/retention_job.py)
- [scripts/incident_drill.py](../scripts/incident_drill.py)

## Padrao de responsabilidade
- Frontend:
  - Renderizacao e interacao de usuario via Nuxt 3 SSG.
  - Emissao de eventos de telemetria.
  - Consumo dos endpoints HTTP.
  - Configuracoes de UI compartilhadas via composables, stores e runtime config do Nuxt.
- Backend:
  - Exposicao de endpoints (telemetria, compliance, observability, mock de integracao).
  - Persistencia SQLite e agregacoes operacionais.
  - Jobs de retencao e incident drill.

## Configuracao centralizada de banner
- O frontend canônico em Nuxt concentra a configuracao visual em componentes e runtime config.
- O banner legado permanece apenas como referencia historica no frontend antigo.

## Comandos canonicos
Servidor local:
- python3 backend/fastapi_server.py --port 8080

Retencao:
- npm run compliance:retention
- npm run compliance:retention:dry-run

Incident drill:
- npm run compliance:incident:drill
- npm run compliance:incident:drill:observe

## Decisao de compatibilidade
Os caminhos em scripts foram mantidos como wrappers para evitar quebra em:
- pipelines existentes
- automacoes locais antigas
- documentacoes ou comandos externos ainda nao atualizados

## Proximos passos recomendados
- Migrar gradualmente todas as referencias externas para os caminhos de backend.
- Introduzir checagens lint/format separadas por camada.
- Evoluir para contratos de API versionados para endpoints internos, se necessario.
