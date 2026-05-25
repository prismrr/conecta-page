# Observability e Telemetria

Este documento descreve como a telemetria e a observabilidade funcionam no projeto, incluindo fluxo de dados, configuracao, operacao local e diagnostico.

## Objetivo
- Coletar eventos operacionais e de produto de forma padronizada.
- Permitir analise local imediata em arquivo e banco SQLite.
- Encaminhar eventos para destino externo opcional (raw ou Loki).
- Expor visao operacional por endpoints de observabilidade.
- Apoiar governanca e rastreabilidade (incluindo regras de alerta basicas).

## Arquitetura
Fluxo principal:
1. Frontend emite eventos para o endpoint local de telemetria.
2. O servidor grava os eventos em NDJSON e em SQLite.
3. Se configurado, o servidor faz forwarding dos eventos para destino externo.
4. Endpoints de observabilidade agregam metricas e saude operacional.
5. Opcionalmente, Loki + Grafana permitem exploracao persistente.

Componentes:
- Emissor frontend: [assets/js/site.js](../assets/js/site.js)
- Config frontend: [assets/js/config.js](../assets/js/config.js)
- Coletor e agregador: [scripts/dev_server.py](../scripts/dev_server.py)
- Stack local observability: [ops/observability/docker-compose.yml](../ops/observability/docker-compose.yml)
- Config do Loki: [ops/observability/loki/loki-config.yaml](../ops/observability/loki/loki-config.yaml)

## Dados de telemetria
Endpoint de coleta:
- POST /telemetry/events

Formato esperado (exemplo):
{
  "event": "page_view",
  "timestamp": "2026-05-23T00:00:00Z",
  "page": "home",
  "path": "/index.html",
  "release_id": "mvp-0.2.0",
  "environment": "development",
  "source_channel": "web",
  "session_id": "local-test",
  "data": {
    "outcome": "ok"
  }
}

Persistencia local:
- Arquivo NDJSON: logs/telemetry-events.ndjson
- Tabela SQLite: telemetry_events

Status de forwarding por evento:
- forwarded
- not_configured
- forward_config_error
- forward_failed
- forward_failed_http_<status>

## Configuracao
Variaveis de ambiente em [.env.example](../.env.example):
- TELEMETRY_ENABLED
- TELEMETRY_ENDPOINT_URL
- TELEMETRY_ENVIRONMENT
- TELEMETRY_RELEASE_ID
- TELEMETRY_SOURCE_CHANNEL
- TELEMETRY_CONSOLE_DEBUG

Forwarding externo:
- TELEMETRY_FORWARD_URL
- TELEMETRY_FORWARD_PROVIDER (raw ou loki)
- TELEMETRY_FORWARD_AUTH_TYPE (none, bearer, x-api-key, basic)
- TELEMETRY_FORWARD_AUTH_TOKEN
- TELEMETRY_FORWARD_AUTH_HEADER
- TELEMETRY_FORWARD_USERNAME
- TELEMETRY_FORWARD_PASSWORD
- TELEMETRY_FORWARD_TIMEOUT_SECONDS

Regras basicas de alerta:
- OBSERVABILITY_ALERT_FAILURE_THRESHOLD
- OBSERVABILITY_ALERT_WINDOW_MINUTES

Credenciais locais do Grafana:
- GRAFANA_ADMIN_USER
- GRAFANA_ADMIN_PASSWORD

## Forwarding e formatos
Provider raw:
- Encaminha o payload original como JSON.

Provider loki:
- Encapsula em streams Loki.
- Labels enviados:
  - job=conecta-telemetry
  - environment
  - release_id
  - event
  - source_channel

Autenticacao suportada:
- none
- bearer
- x-api-key
- basic

## Endpoints de observabilidade
Resumo operacional:
- GET /observability/summary?windowMinutes=60
- Retorna total de eventos, agregacoes por release e evento, e status de forwarding.

Alertas:
- GET /observability/alerts?limit=20
- Retorna alertas gerados na tabela observability_alerts.

Saude:
- GET /observability/health
- Retorna status geral, estado do banco, configuracao de forwarding, ultimo evento e ultimo alerta.

Health basico do servidor:
- GET /healthz

Detalhes completos de API:
- [docs/api.md](./api.md)

## Regra de alerta implementada
Tipo:
- external_data_sync_failed_spike

Comportamento:
- Conta eventos external_data_sync_failed por release em janela configuravel.
- Abre alerta com severidade high quando ultrapassa o limiar.
- Usa fingerprint por bucket de tempo para evitar duplicacao excessiva.

## Stack local com Loki e Grafana
Subir somente observability:
- docker compose -f ops/observability/docker-compose.yml up -d

Subir app + observability:
- npm run dev:docker:full

Acessos:
- App: http://localhost:8080
- Loki: http://localhost:3100/ready
- Grafana: http://localhost:3000

Consulta sugerida no Grafana Explore (Loki):
- {job="conecta-telemetry"}

Encerrar stack completa:
- npm run dev:docker:full:down

## Operacao e verificacoes rapidas
1. Validar saude geral:
- GET /observability/health

2. Verificar volume recente:
- GET /observability/summary?windowMinutes=60

3. Verificar alertas:
- GET /observability/alerts?limit=20

4. Confirmar ingestao no Loki:
- Grafana Explore com query por job e release_id.

## Troubleshooting
Falha de forwarding (forward_failed):
- Verificar TELEMETRY_FORWARD_URL e conectividade.
- Verificar timeout em TELEMETRY_FORWARD_TIMEOUT_SECONDS.

Erro de configuracao (forward_config_error):
- Revisar auth type e credenciais.
- Validar token/header para modo x-api-key ou bearer.
- Validar usuario/senha para basic.

Eventos nao aparecem no Grafana:
- Confirmar provider loki e URL correta /loki/api/v1/push.
- Confirmar stack Loki/Grafana em execucao.
- Confirmar query com label job=conecta-telemetry.

Mount error em compose multiarquivo:
- Garantir uso dos scripts npm full stack ja preparados para PWD.
- Conferir paths absolutos no compose de observability.

## Boas praticas
- Preencher release_id por versao para facilitar correlacao.
- Manter environment consistente por ambiente de execucao.
- Evitar dados pessoais em payloads de telemetria.
- Usar eventos de falha de integracao para observabilidade de degradacao.

## Referencias
- [scripts/dev_server.py](../scripts/dev_server.py)
- [assets/js/config.js](../assets/js/config.js)
- [ops/observability/docker-compose.yml](../ops/observability/docker-compose.yml)
- [.env.example](../.env.example)
- [docs/api.md](./api.md)
