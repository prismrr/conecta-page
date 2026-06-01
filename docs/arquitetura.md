# Arquitetura do Projeto

Este documento apresenta o mapa unico da arquitetura do Conecta PrismRR, com separacao entre frontend, backend e infraestrutura.

## Mapa de camadas

```mermaid
flowchart LR
    U[Usuario/Navegador] --> FE[Frontend estatico\nindex/pages/assets]
    FE -->|HTTP JSON| BE[Backend local\nbackend/fastapi_server.py]
    FE -->|Eventos| TE[POST /telemetry/events]

    BE --> DB[(SQLite\ndata/compliance.db)]
    BE --> LOG[(NDJSON\nlogs/telemetry-events.ndjson)]
    BE --> OBS[Observability APIs\n/observability/*]
    BE --> COMP[Compliance APIs\n/compliance/*]
    BE --> REG[Mock Integracao\n/api/registrations/*]
    BE --> INS[Inscricoes Normalizadas\n/api/inscricoes/*]

    CSV[CSV externo\nURL publica/autenticada] --> SRC[CSV source local\nconecta-csv-source]
    SRC --> CEL[Celery Worker\nconecta-worker]
    REDIS[(Redis Broker\nconecta-redis)] --> CEL
    BEAT[Celery Beat\nconecta-beat] --> REDIS
    CEL --> DB

    BE -->|Forwarding opcional| LOKI[Loki]
    LOKI --> GRAF[Grafana]

    JOB1[backend/jobs/retention_job.py] --> DB
    JOB2[backend/jobs/incident_drill.py] --> DB

    DEP[backend/deploy/*] --> SITE[Artefato estatico .deploy/dist]
```

## Estrutura canonica

Frontend:
- [frontend/README.md](../frontend/README.md)
- [index.html](../index.html)
- [pages](../pages)
- [assets](../assets)

Backend:
- [backend/fastapi_server.py](../backend/fastapi_server.py)
- [backend/jobs/retention_job.py](../backend/jobs/retention_job.py)
- [backend/jobs/incident_drill.py](../backend/jobs/incident_drill.py)
- [backend/deploy/build_static.sh](../backend/deploy/build_static.sh)
- [backend/deploy/deploy_static.sh](../backend/deploy/deploy_static.sh)

Infra:
- [infra/observability/docker-compose.yml](../infra/observability/docker-compose.yml)
- [infra/observability/loki/loki-config.yaml](../infra/observability/loki/loki-config.yaml)
- [infra/observability/grafana/provisioning/datasources/loki.yaml](../infra/observability/grafana/provisioning/datasources/loki.yaml)

Compatibilidade legada:
- [scripts](../scripts) (wrappers de compatibilidade)
- Plano de transicao concluido: [docs/deprecacao-ops.md](./deprecacao-ops.md)

## Fronteiras de responsabilidade

Frontend:
- Renderizacao e UX.
- Emissao de telemetria.
- Consumo de APIs locais/remotas.
- Configuracao do banner superior centralizada em componentes Nuxt e runtime config.

Backend:
- Exposicao de APIs de telemetria, compliance, observability e mock de integracao.
- Persistencia SQLite e agregacoes.
- Jobs operacionais e evidencias de compliance.
- Build/deploy estatico.

Infra:
- Stack local Loki/Grafana para persistencia e exploracao de observabilidade.
- Configuracoes de runtime dos componentes de observability.

## Fluxos principais

Fluxo de telemetria:
1. Frontend envia evento para /telemetry/events.
2. Backend grava em NDJSON e SQLite.
3. Backend faz forwarding opcional para Loki.
4. Grafana consulta dados via Loki.

Fluxo de compliance:
1. Frontend ou job escreve eventos em /compliance/* ou direto nas rotinas.
2. Backend persiste trilha append-only em SQLite.
3. Jobs de retencao e incident drill geram evidencias.

Fluxo de ingestao assincrona de inscricoes:
1. Worker Celery baixa CSV de origem (URL publica ou autenticada).
2. Pipeline valida encoding, schema e tipagem de cada linha.
3. Worker executa upsert incremental no banco intermediario SQLite.
4. API de leitura consulta apenas /api/inscricoes/* no banco intermediario.
5. Falhas na origem nao interrompem consultas da API, que permanecem desacopladas.

Diagrama dedicado do fluxo de ingestao:

```mermaid
flowchart LR
    SOURCE[CSV externo\nCONECTA_INSCRICOES_CSV_URL] --> DL[Download + checksum]
    REDIS[(Redis broker)] --> WORKER[Celery Worker]
    BEAT[Celery Beat] --> REDIS
    WORKER --> DL
    DL --> VAL[Validacao estrita\nencoding/schema/tipos]
    VAL --> UPSERT[Upsert incremental por ID]
    UPSERT --> DB[(SQLite intermediario\ninscricoes + ingest_batches)]
    API[FastAPI\n/api/inscricoes/{id}] --> DB
    API2[FastAPI\n/api/inscricoes/lotes/{loteImportacao}] --> DB
```

Fluxo de deploy:
1. Build estatico por [backend/deploy/build_static.sh](../backend/deploy/build_static.sh).
2. Publicacao por [backend/deploy/deploy_static.sh](../backend/deploy/deploy_static.sh).
3. CI executa workflow de deploy em ambientes develop/production.

## Configuracao centralizada de UI

Banner superior dinamico:
1. O conteudo fica em runtime config e componentes Nuxt.
2. O frontend renderiza o banner em componentes Vue, sem depender dos arquivos HTML legados.
3. As paginas HTML nao repetem mais markup de banner, reduzindo divergencia entre rotas.

Campos esperados em `topBanner`:
- `enabled`: liga/desliga exibicao.
- `label`: prefixo em destaque (ex.: Comunicado:).
- `message`: texto principal exibido para o usuario.

## Comandos canonicos

- Servidor local: `python3 backend/fastapi_server.py --port 8080`
- Stack observability: `docker compose -f infra/observability/docker-compose.yml up -d`
- Stack completa local: `npm run dev:docker:full`
- Stack ingestao (Redis + Celery): `npm run dev:docker:ingestion:up`
- Trigger manual da ingestao: `npm run dev:docker:ingestion:trigger`
- Logs da ingestao: `npm run dev:docker:ingestion:logs`
- Encerrar stack de ingestao: `npm run dev:docker:ingestion:down`
- Build deploy: `npm run deploy:build`
