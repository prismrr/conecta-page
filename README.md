# Conecta PrismRR

Portal oficial do PRISM Conecta com frontend canonico em Nuxt 3 SSG, estado centralizado com Pinia, integracao contratual segura e trilha de compliance/observabilidade local.

## Escopo implementado
- Portal canônico em Nuxt 3 SSG para pagina inicial, inscricoes, programacao, FAQ e area legal.
- Preferencias de consentimento granulares e revogaveis por categoria.
- Telemetria, compliance e observabilidade com persistencia local e gating por consentimento.
- Legado HTML/JS descomissionado e fora do artefato canônico.

## Estrutura
- [nuxt-app](nuxt-app) - frontend canônico em Nuxt 3 SSG
- [nuxt-app/pages](nuxt-app/pages)
- [nuxt-app/components](nuxt-app/components)
- [nuxt-app/stores](nuxt-app/stores)
- [backend](backend) - servidor local, jobs e deploy
- [tests](tests) - unit, component, contract, integration e E2E
- [docs](docs) - arquitetura, observabilidade e readiness
- [scripts](scripts) - automacoes shell e utilitarios locais
- [.SPECS](.SPECS) - fonte de verdade para produto, qualidade e compliance

Guia de organizacao frontend x backend: [docs/organizacao-projeto.md](docs/organizacao-projeto.md)
Mapa de arquitetura: [docs/arquitetura.md](docs/arquitetura.md)
Plano de deprecacao do legado ops: [docs/deprecacao-ops.md](docs/deprecacao-ops.md)
Readiness de corte do legado ops: [docs/readiness-corte-ops.md](docs/readiness-corte-ops.md)

## Orientacoes de inscricao versionadas
As versoes publicadas da chamada ficam em dados versionados consumidos pelo Nuxt em [nuxt-app/pages/inscricoes.vue](nuxt-app/pages/inscricoes.vue).

O modelo atual define:

- `currentVersionId`: versao vigente exibida na pagina
- `versions`: historico de versoes publicadas com vigencia, autoria, aprovacao e changelog

Ao atualizar a chamada, publique uma nova entrada e mova o `currentVersionId` para a versao aprovada.

## Agenda filtravel
As sessoes da rota Nuxt /programacao ficam em dados versionados consumidos em [nuxt-app/pages/programacao.vue](nuxt-app/pages/programacao.vue).

O frontend ordena o cronograma por `startTime` e permite filtrar por:

- `track`
- `period`

Ao adicionar uma nova sessao, informe ao menos `startTime`, `endTime`, `title`, `track` e `period` para manter a agenda consistente.

Os perfis de palestrantes da mesma pagina tambem sao dirigidos pelos mesmos dados versionados.

Cada perfil aceita:

- `name`
- `institution`
- `area`
- `bio`
- `links[]`

## FAQ curada
A FAQ publicada na rota Nuxt /faq usa como fonte os dados versionados consumidos em [nuxt-app/pages/faq.vue](nuxt-app/pages/faq.vue).

Cada entrada da base curada define:

- `category`
- `question`
- `answer`

As respostas atuais foram consolidadas a partir do conteudo oficial das paginas Home, Inscricoes, Programacao e Privacidade.

## Consentimento granular (PRD-RQ06)
As preferencias de consentimento sao acessiveis em todas as paginas pelo atalho "Preferencias de consentimento".

Categorias atuais:

- `essential` (sempre ativo)
- `analytics_optional`
- `communication_optional`

Persistencia local:

- chave: `conecta_consent_preferences_v2`
- campos: `version`, `updatedAt`, `status`, `categories`

Comportamento de telemetria:

- eventos nao essenciais so sao emitidos com `analytics_optional = true`
- eventos de consentimento (`consent_granted`, `consent_revoked`, `consent_updated`) permanecem auditaveis

## Gestao de cookies por categoria (PRD-RQ07)
As categorias de cookies usam a mesma base de preferencias de consentimento (`conecta_consent_preferences_v2`).

Cookies atualmente gerenciados:

- `conecta_cookie_essential` (sempre ativo)
- `conecta_cookie_analytics_optin` (ativo apenas com `analytics_optional = true`)
- `conecta_cookie_communication_optin` (ativo apenas com `communication_optional = true`)

Ao revogar categorias opcionais, os cookies opcionais correspondentes sao removidos imediatamente no navegador.

## Politica e Termo versionados (PRD-RQ11)
Os documentos legais versionados sao renderizados a partir dos dados consumidos em [nuxt-app/pages/politica-privacidade.vue](nuxt-app/pages/politica-privacidade.vue) e [nuxt-app/pages/termos-uso.vue](nuxt-app/pages/termos-uso.vue).

Paginas:

- rota Nuxt /politica-privacidade
- rota Nuxt /termos-uso

Cada documento exibe:

- versao vigente
- data de vigencia
- changelog visivel por versao publicada

## Canal de direitos do titular (PRD-RQ09)
Canal minimo implementado na rota Nuxt /politica-privacidade com:

- formulario de solicitacao por tipo (acesso, correcao, exclusao, exportacao, revogacao)
- geracao imediata de protocolo no formato `DSAR-YYYYMMDD-XXXXXX`
- instrucoes de atendimento e prazo inicial de resposta

Registro local de protocolo:

- chave `conecta_dsar_requests_v1`
- armazenamento minimizado (sem persistir email informado no formulario)

## Trilha de auditoria de conteudo critico (PRD-RQ08)
A trilha de auditoria e renderizada na rota Nuxt /politica-privacidade a partir do componente [nuxt-app/components/legal/AuditTrailGrid.vue](nuxt-app/components/legal/AuditTrailGrid.vue).

Cada evento registra:

- autor
- data da alteracao
- versao publicada
- protocolo de auditoria

O fluxo foi modelado como append-only no lado do cliente para manter historico de alteracoes criticas no MVP estatico.

## Monitoramento operacional da integracao externa (PRD-RQ10)
O monitoramento operacional foi adicionado na rota Nuxt /inscricoes, com atualizacao pelo fluxo de consulta em [nuxt-app/plugins/telemetry.client.ts](nuxt-app/plugins/telemetry.client.ts).

Sinais exibidos:

- `Provider disponivel`: resposta valida, nao encontrado ou retorno com exigencia de autorizacao
- `Provider em modo degradado`: resposta recebida com contrato invalido
- `Provider indisponivel`: erro operacional, timeout ou falha HTTP do provider

Resumo operacional por sessao:

- total de consultas realizadas
- respostas disponiveis
- falhas do provider
- ocorrencias em modo degradado

O painel tambem apresenta timestamp da ultima atualizacao e detalhe do ultimo evento operacional.

## Persistencia real para compliance (Sprint 3 item 3)
Foi adicionada persistencia SQL minima via SQLite no servidor local [backend/server/dev_server.py](backend/server/dev_server.py), com base padrao em `data/compliance.db`.

Tabelas criadas:

- `consent_records` para historico de consentimento granular
- `integration_monitor_events` para eventos de disponibilidade/falha da integracao externa
- `content_audit_events` para trilha append-only de alteracoes de conteudo critico

Endpoints de compliance:

- `POST /compliance/consent-records`
- `GET /compliance/consent-records?limit=20`
- `POST /compliance/integration-events`
- `GET /compliance/integration-summary`
- `GET /compliance/content-audit-events?limit=50`
- `POST /compliance/content-audit-events` (append-only; `eventId` unico)

Integracoes no frontend:

- [nuxt-app/plugins/telemetry.client.ts](nuxt-app/plugins/telemetry.client.ts) persiste atualizacoes de consentimento no endpoint SQL
- resumo operacional da integracao externa passa a ser hidratado do endpoint `integration-summary`
- trilha de auditoria tenta carregar eventos do endpoint SQL com fallback para dataset local

Inventario LGPD versionado:

- [docs/privacy-data-map.json](docs/privacy-data-map.json) consolida superficies, finalidade, retencao e categorias proibidas para revisao de privacidade.

## Retencao e descarte automatizados (LGPD-RF08)
Foi adicionado um job de retencao para a base SQLite em [backend/jobs/retention_job.py](backend/jobs/retention_job.py), com relatorio auditavel por execucao.

Politica inicial de temporalidade:

- `consent_records`: 730 dias
- `integration_monitor_events`: 365 dias
- `telemetry_events`: 180 dias
- `observability_alerts`: 180 dias

Evidencias geradas por execucao:

- relatorio JSON em `logs/compliance-retention-report.json` (ou caminho customizado)
- trilha append-only na tabela `compliance_retention_runs`

Comandos locais:

- simulacao sem descarte: `npm run compliance:retention:dry-run`
- execucao aplicando descarte: `npm run compliance:retention`

Automacao periodica:

- workflow agendado em [.github/workflows/compliance-retention.yml](.github/workflows/compliance-retention.yml)
- periodicidade diaria via `cron`
- publicacao de artifact `compliance-retention-report`

## Plano operacional de incidente e prova de exercicio (LGPD-RF12)
Foi adicionado um playbook tecnico executavel em [backend/jobs/incident_drill.py](backend/jobs/incident_drill.py), com simulacao controlada de indisponibilidade do provider externo e evidencias auditaveis por execucao.

Escopo do exercicio automatizado:

- deteccao de falhas repetidas de sincronizacao externa
- classificacao de severidade com alerta operacional
- verificacao de acao de contencao (modo degradado)
- checklist de notificacao para DPO/fluxo ANPD
- criterios de recuperacao e revisao pos-incidente

Evidencias geradas:

- relatorio JSON em `logs/compliance-incident-drill-report.json` (ou caminho customizado)
- trilha append-only na tabela `compliance_incident_drills`

Comandos locais:

- executar simulacao completa: `npm run compliance:incident:drill`
- executar somente verificacao sem simular falha: `npm run compliance:incident:drill:observe`

Integracao com pipeline operacional:

- etapa bloqueante no CI principal em [.github/workflows/ci.yml](.github/workflows/ci.yml)
- workflow dedicado e agendado em [.github/workflows/compliance-incident-drill.yml](.github/workflows/compliance-incident-drill.yml)
- artifact `compliance-incident-drill-evidence` com relatorio e base SQLite do exercicio

## Rotina operacional de DSAR (LGPD-RF09)
O canal de direitos do titular agora registra a solicitacao no backend, gera exportacao minimizada e suporta exclusao segura do artefato temporario.

Fluxo operacional:

1. Registrar solicitacao em `POST /compliance/dsar-requests`.
2. Gerar pacote de exportacao em `POST /compliance/dsar-requests/{protocol}/export`.
3. Executar exclusao segura em `POST /compliance/dsar-requests/{protocol}/secure-delete`.

Evidencias geradas:

- tabela `dsar_requests` em `data/compliance.db`
- export temporario em `logs/dsar-exports/{protocol}.json`
- tombstone minimo mantido no banco apos exclusao segura

Validacao local:

- `npm run test:integration -- tests/integration/dev-server.integration.test.js`

Observacao:
- o formulario em [nuxt-app/components/legal/DsarRequestForm.vue](nuxt-app/components/legal/DsarRequestForm.vue) tenta registrar a solicitacao no backend e cai para modo local apenas se o backend estiver indisponivel.

## Proxima fase de endurecimento
O plano de adequacao agora deixa explicito um Milestone 7 para controles que ainda merecem formalizacao recorrente:

- RBAC/MFA em superficies administrativas e rotas sensiveis.
- Catalogo de terceiros com base legal, escopo de dados e salvaguardas de transferencia.
- Evidencias de criptografia, gestao de chaves, backup e restauracao.
- Sincronia entre documentos publicos, changelog e canais de privacidade.
- Evidencias periodicas de gestao de vulnerabilidades e revisao tecnica.

## Executar localmente
Opcao 1: servidor local com coletor de telemetria:

`python3 backend/server/dev_server.py --port 8080`

Depois acesse `http://localhost:8080`.

Opcao 2: modo Nuxt dev:

`npm run nuxt:dev`

Opcao 3: Docker Compose para desenvolvedores (usa [docker-compose.local.yml](docker-compose.local.yml), gera o build do Nuxt e carrega [.env](.env) automaticamente):

`bash scripts/dev_docker.sh up`

Ou via npm:

- `npm run dev:docker:build`
- `npm run dev:docker`
- `npm run dev:docker:logs`
- `npm run dev:docker:down`

Com essa opcao, a aplicacao roda com o servidor [backend/server/dev_server.py](backend/server/dev_server.py) dentro do container, servindo o artefato Nuxt em `nuxt-app/.output/public`, e fica disponivel em `http://localhost:8080`.

O compose local carrega variaveis de [.env](.env) automaticamente, com fallback em [.env.example](.env.example).

### Teste completo com Docker Compose (App + Loki + Grafana)
Esta opcao sobe a aplicacao local, o Loki e o Grafana juntos para validar o fluxo completo de telemetria e observabilidade.

1. (Opcional) Defina credenciais locais do Grafana no `.env` (base: [.env.example](.env.example)):

- `GRAFANA_ADMIN_USER=admin`
- `GRAFANA_ADMIN_PASSWORD=admin`

2. Suba stack completa com forwarding para Loki:

`PWD=$(pwd) TELEMETRY_FORWARD_URL=http://loki:3100/loki/api/v1/push TELEMETRY_FORWARD_PROVIDER=loki docker compose -f docker-compose.local.yml -f infra/observability/docker-compose.yml up -d`

Atalho via npm:

- `npm run dev:docker:build`
- `npm run dev:docker:full`
- `npm run dev:docker:full:logs`
- `npm run dev:docker:full:down`

Observacao: `npm run dev:docker:full` executa build automatizado via Docker Compose antes de subir App + Loki + Grafana.

3. Acesse os componentes:

- Aplicacao: `http://localhost:8080`
- Grafana: `http://localhost:3000`
- Loki API (debug): `http://localhost:3100/ready`

4. Gere eventos de telemetria (navegando na UI ou via curl):

`curl -X POST http://localhost:8080/telemetry/events -H "Content-Type: application/json" -d '{"event":"page_view","timestamp":"2026-05-23T00:00:00Z","page":"home","path":"/","release_id":"local-stack","environment":"development","source_channel":"web","session_id":"local-test","data":{"outcome":"ok"}}'`

5. No Grafana, confirme ingestao:

- Login com `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD`
- Explore -> Loki
- Query sugerida: `{job="conecta-telemetry"}`

6. Encerrar stack completa:

`docker compose -f docker-compose.local.yml -f infra/observability/docker-compose.yml down`

Observacao:
- Se o forwarding estiver ativo para Loki, o endpoint `GET /observability/health` deve mostrar `forwarding.configured=true`.

## Integracao real de consulta de inscricao
O fluxo de consulta na rota Nuxt /inscricoes usa requisicao HTTP real com retry, timeout e validacao de contrato.

### 1. Configurar endpoint
Edite [nuxt-app/nuxt.config.ts](nuxt-app/nuxt.config.ts):

- baseUrl: dominio da API de resultados
- endpointTemplate: caminho com placeholder `{registrationId}`
- timeoutMs: timeout por tentativa
- maxRetries: numero maximo de tentativas

Exemplo:

baseUrl: "https://api.seudominio.br"
endpointTemplate: "/api/registrations/{registrationId}"

### 2. Contrato esperado
Arquivo de referencia (OpenAPI versionado): [contracts/openapi/registration-result.v1.0.0.openapi.json](contracts/openapi/registration-result.v1.0.0.openapi.json)

Payload esperado (JSON):

{
	"registrationId": "PRISM-2026-001",
	"status": "APPROVED",
	"updatedAt": "2026-05-22T13:10:00Z",
	"detail": "Classificado para a trilha principal"
}

Campos obrigatorios:
- registrationId (string)
- status (APPROVED | UNDER_REVIEW | REJECTED)
- updatedAt (date-time ISO)

Se o payload violar o contrato, a tela entra em modo degradado com mensagem de indisponibilidade controlada.

### 3. Teste de contrato dedicado
Para validar o contrato formal da integracao externa de forma isolada:

`npm run test:contract`

O teste dedicado fica em [tests/contract/registration-openapi.contract.test.js](tests/contract/registration-openapi.contract.test.js) e valida:

- metadados de versao do OpenAPI
- payloads 200 contra schema `RegistrationResult`
- payloads de erro (401/404/503) contra schema `ErrorResponse`
- deteccao de payload invalido de contrato no cenario `PRISM-2026-999`

## Telemetria de eventos criticos do funil
Implementada no frontend em [nuxt-app/plugins/telemetry.client.ts](nuxt-app/plugins/telemetry.client.ts), com configuracao em [nuxt-app/nuxt.config.ts](nuxt-app/nuxt.config.ts).

## Acessibilidade automatizada em PR (Sprint 4 item 1)
Foi adicionada validacao automatizada com axe-core via Playwright para rotas criticas:

- `/`
- `/inscricoes`
- `/programacao`
- `/politica-privacidade`

Comando dedicado:

`npm run test:a11y`

Arquivo de teste: [tests/e2e/accessibility.spec.js](tests/e2e/accessibility.spec.js)

O pipeline de PR em [/.github/workflows/ci.yml](.github/workflows/ci.yml) executa esse stage de forma bloqueante antes do E2E completo.

## VRT e hardening visual (Sprint 4 item 2)
Foi adicionada uma suite de visual regression para paginas criticas com baseline via Playwright snapshots.

Comando dedicado:

`npm run test:vrt`

Arquivo de teste: [tests/e2e/visual-regression.spec.js](tests/e2e/visual-regression.spec.js)

Cobertura inicial:

- Home
- Inscricoes
- Programacao
- Politica de Privacidade

O pipeline de PR em [/.github/workflows/ci.yml](.github/workflows/ci.yml) executa o VRT como etapa bloqueante antes do E2E completo.

## AppSec no CI (Sprint 4 item 3)
Foi adicionada uma esteira inicial de AppSec no pipeline de PR em [/.github/workflows/ci.yml](.github/workflows/ci.yml), com gates bloqueantes para:

- SAST com Semgrep (`p/security-audit`)
- SCA com OSV Scanner (`-r .`)

Os checks rodam em job dedicado (`appsec`) e bloqueiam merge quando houver falhas.

## Observabilidade avancada (Sprint 4 item 4)
Foi estruturada uma camada de observabilidade no servidor local [backend/server/dev_server.py](backend/server/dev_server.py) com:

- destino real opcional para forwarding de telemetria
- alertas basicos por limiar de falhas de sincronizacao externa
- correlacao de eventos por `release_id`

Configuracao por argumentos do servidor:

- `--telemetry-forward-url` destino HTTP externo (opcional)
- `--telemetry-forward-provider` formato de envio (`raw` ou `loki`)
- `--telemetry-forward-auth-type` autenticacao (`none`, `bearer`, `x-api-key`, `basic`)
- `--telemetry-forward-auth-token` token para `bearer` ou `x-api-key`
- `--telemetry-forward-auth-header` nome do header no modo `x-api-key`
- `--telemetry-forward-username` usuario no modo `basic`
- `--telemetry-forward-password` senha no modo `basic`
- `--telemetry-forward-timeout-seconds` timeout do envio para destino externo
- `--alert-failure-threshold` limiar de disparo de alerta (padrao 3)
- `--alert-window-minutes` janela de avaliacao do alerta (padrao 15)

As mesmas configuracoes podem ser carregadas por variaveis de ambiente em [.env.example](.env.example):

- `TELEMETRY_FORWARD_URL`
- `TELEMETRY_FORWARD_PROVIDER`
- `TELEMETRY_FORWARD_AUTH_TYPE`
- `TELEMETRY_FORWARD_AUTH_TOKEN`
- `TELEMETRY_FORWARD_AUTH_HEADER`
- `TELEMETRY_FORWARD_USERNAME`
- `TELEMETRY_FORWARD_PASSWORD`
- `TELEMETRY_FORWARD_TIMEOUT_SECONDS`

Endpoints operacionais:

- `GET /observability/summary?windowMinutes=60`
- `GET /observability/alerts?limit=20`
- `GET /observability/health`

Detalhes do resumo operacional:

- volume total de eventos na janela
- agregacao por release
- agregacao por tipo de evento
- status de forwarding (`forwarded`, `notConfigured`, `failed`)

Regra inicial de alerta:

- cria alerta `external_data_sync_failed_spike` com severidade `high`
- dispara quando `external_data_sync_failed` atinge o limiar na janela configurada por release

Health operacional:

- status geral da camada de observabilidade (`ok` ou `degraded`)
- status de conexao com banco local
- estado de configuracao de forwarding
- ultimo evento de telemetria e ultimo alerta
- contagens das ultimas 24h

### Destino real com persistencia (Loki + Grafana)
Para operacionalizar observabilidade persistente com stack local, foi adicionada uma composicao em [infra/observability/docker-compose.yml](infra/observability/docker-compose.yml) com:

- Loki para armazenamento persistente de logs de telemetria
- Grafana para consulta e dashboards
- Volumes nomeados (`loki-data`, `grafana-data`) para persistencia

Suba a stack:

`docker compose -f infra/observability/docker-compose.yml up -d`

Configure o servidor para enviar eventos para Loki:

`python3 backend/server/dev_server.py --port 8080 --telemetry-forward-url http://127.0.0.1:3100/loki/api/v1/push --telemetry-forward-provider loki`

Opcional com API key:

`python3 backend/server/dev_server.py --port 8080 --telemetry-forward-url https://seu-gateway-observability.example/loki/api/v1/push --telemetry-forward-provider loki --telemetry-forward-auth-type x-api-key --telemetry-forward-auth-token "$TELEMETRY_FORWARD_AUTH_TOKEN"`

Acesse o Grafana em `http://127.0.0.1:3000` com as credenciais definidas em `.env` (`GRAFANA_ADMIN_USER` e `GRAFANA_ADMIN_PASSWORD`).

### Eventos emitidos
- page_view
- cta_click
- registration_guideline_view
- registration_result_view
- consent_granted
- consent_revoked
- external_data_sync_failed

### Configuracao
Em [nuxt-app/nuxt.config.ts](nuxt-app/nuxt.config.ts), ajuste o bloco `runtimeConfig.public`:

- enabled: ativa ou desativa emissao
- endpointUrl: endpoint HTTP para coleta
- environment: ambiente (development, staging, production)
- releaseId: identificador da versao
- sourceChannel: canal de origem (web)
- consoleDebug: imprime payload no console para validacao local

Se `endpointUrl` estiver vazio, os eventos permanecem disponiveis em `window.dataLayer` para inspecao local.

O banner superior e configurado em componentes Nuxt e runtime config, sem dependência dos arquivos legados removidos.

### Coleta local real
Com `endpointUrl` configurado para `/telemetry/events`, execute o servidor de dev:

python3 backend/server/dev_server.py --port 8080

Os eventos recebidos serao gravados em:

logs/telemetry-events.ndjson

Observacao de privacidade:
- O log local nao persiste IP do cliente; apenas timestamp e payload de evento.

Para acompanhar em tempo real:

tail -f logs/telemetry-events.ndjson

## Mock local da API de inscricoes
O servidor de desenvolvimento tambem expoe um mock para a consulta de resultados:

GET /api/registrations/{registrationId}

Exemplos para validar comportamentos da UI:

- PRISM-2026-001: retorno valido com status APPROVED
- PRISM-2026-002: retorno valido com status UNDER_REVIEW
- PRISM-2026-404: retorna 404 (nao encontrado)
- PRISM-2026-401: retorna 401 (sem autorizacao)
- PRISM-2026-503: retorna 503 (indisponivel)
- PRISM-2026-999: retorna payload invalido para testar modo degradado por contrato

Teste rapido via terminal:

curl http://localhost:8080/api/registrations/PRISM-2026-001

## Smoke test automatizado
Para validar de uma vez a API mock de inscricoes e o endpoint de telemetria:

bash scripts/smoke_test.sh

O script:
- usa servidor existente em `http://127.0.0.1:8080` se estiver ativo
- inicia `backend/server/dev_server.py` automaticamente se necessario
- valida cenarios de sucesso, erro HTTP e contrato invalido
- valida POST em `/telemetry/events`

## Suite de testes automatizados
Stack de testes alinhada ao `.SPECS/test_design.md`:

- Unit: Vitest (regras e contrato de payload)
- Integracao: Vitest (servidor local + endpoints mock/telemetria)
- E2E: Playwright (fluxos criticos da pagina de inscricoes)

### Instalar dependencias

npm install

Para primeira execucao de E2E, instale o browser do Playwright:

npx playwright install chromium

### Executar suites

npm run test:unit
npm run test:integration
npm run test:e2e

Ou tudo em sequencia:

npm test

## Checklist final da migracao Nuxt
Para o fechamento da migracao Vue/Nuxt com hardening de contratos e observabilidade, consulte:

- [docs/migracao-nuxt-checklist-final.md](docs/migracao-nuxt-checklist-final.md)
- [docs/milestone7-estabilizacao-descomissionamento.md](docs/milestone7-estabilizacao-descomissionamento.md)

## CI automatizado (GitHub Actions)
Workflow configurado em [.github/workflows/ci.yml](.github/workflows/ci.yml).

Executa automaticamente em `pull_request` e `push` para `develop` e `main`.

Fluxos canônicos utilizados no projeto:

- `npm run compliance:privacy:inventory` (gate LGPD do inventário de dados e retenção)
- `npm run ci:tests` (pipeline completo de testes)
- `npm run ci:build` (build estatico + validacao do artefato)
- `npm run build:ci` (ci:tests + ci:build)

Evidencia LGPD gerada pelo gate de inventario:

- relatorio Markdown em `logs/privacy-data-report.md`
- relatorio JSON em `logs/privacy-data-report.json`
- artifact `privacy-inventory-report-ci` no GitHub Actions

O relatorio consolida superficies, retenção, categorias proibidas e pendencias de validacao para auditoria de privacidade.

Checklist operacional de adequacao:

- [docs/lgpd-audit-checklist.md](docs/lgpd-audit-checklist.md)

Dentro do workflow, os jobs executam os comandos equivalentes abaixo:

- `npm run ci:tests`
- `npm run ci:build`

Em caso de falha, o workflow faz upload de artefatos para diagnostico:

- `playwright-artifacts` (traces e resultados E2E)
- `telemetry-logs-sanitized` (logs de telemetria com IP mascarado e campos sensiveis reduzidos)

## Deploy para develop e production
Foi adicionada automacao de deploy em dois ambientes com scripts reutilizaveis e workflow dedicado.

Arquivos principais:

- workflow de deploy: [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
- script base de empacotamento: [backend/deploy/build_static.sh](backend/deploy/build_static.sh)
- script base de publicacao: [backend/deploy/deploy_static.sh](backend/deploy/deploy_static.sh)
- wrappers por ambiente (canonicos):
	- [backend/deploy/deploy_develop.sh](backend/deploy/deploy_develop.sh)
	- [backend/deploy/deploy_production.sh](backend/deploy/deploy_production.sh)
- compatibilidade legada mantida em [scripts/deploy](scripts/deploy) (wrappers)

Scripts npm:

- `npm run deploy:build`
- `npm run deploy:develop`
- `npm run deploy:production`

Baseline atual de entrega:

- O pacote de release e gerado a partir de `nuxt-app/.output/public`.
- O manifest de release inclui `frontendTrack: nuxt-ssg`.
- O manifest de release inclui `buildEnvironment` para distinguir builds de develop e production.
- O build falha se artefatos legacy forem detectados no payload final.

### Build local (develop e production)
Use os comandos abaixo para validar o empacotamento local e, quando necessario, executar o deploy localmente para cada ambiente.

#### Build local em develop
1. Troque para a branch de develop:

`git checkout develop`

2. Instale dependencias, se necessario:

`npm ci`

3. Gere o build estatico local para validacao:

`npm run deploy:build`

Para reproduzir localmente o mesmo fluxo de testes + build usado no CI do GitHub:

`npm run build:ci`

4. Opcionalmente publique em develop:

`DEPLOY_HOST=staging.seudominio.example DEPLOY_USER=deploy DEPLOY_PATH=/var/www/conecta-staging DEPLOY_SSH_PRIVATE_KEY="$(cat /caminho/chave_staging)" npm run deploy:develop`

Artefato gerado:

- `.deploy/dist/RELEASE_MANIFEST.json`

O manifesto registra `buildEnvironment=develop` quando o wrapper de develop e usado.

#### Build local em production
1. Gere o build estatico local para validacao:

`npm run deploy:build`

2. Publique em production com canary e rollback automatico:

`DEPLOY_HOST=prod.seudominio.example DEPLOY_USER=deploy DEPLOY_PATH=/var/www/conecta-prod DEPLOY_SSH_PRIVATE_KEY="$(cat /caminho/chave_prod)" npm run deploy:production`

No deploy de production, o script executa cutover canary com rollback automatico:

- promocao atomica por symlink para a nova release
- janela de observacao com probes de healthcheck
- rollback para a release anterior se falhas ultrapassarem o limiar

Variaveis opcionais de canary para production:

- `DEPLOY_CANARY_DURATION_SECONDS` (padrao: 60)
- `DEPLOY_CANARY_PROBE_INTERVAL_SECONDS` (padrao: 10)
- `DEPLOY_CANARY_MAX_FAILURES` (padrao: 1)
- `DEPLOY_CANARY_SMOKE_URL` (opcional)
- `DEPLOY_FAIL_ON_ROLLBACK` (padrao: true)

Variaveis obrigatorias para deploy local:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_PATH`
- `DEPLOY_SSH_PRIVATE_KEY` (ou `DEPLOY_SSH_KEY_PATH`)

Variaveis opcionais:

- `DEPLOY_PORT` (padrao: 22)
- `DEPLOY_TIMEOUT_SECONDS` (padrao: 20)
- `DEPLOY_HEALTHCHECK_URL` (valida endpoint pos-deploy)

Evidencias locais apos deploy:

- `.deploy/dist/RELEASE_MANIFEST.json`
- `.deploy/deploy-result-develop.json`
- `.deploy/deploy-result-production.json`
- `.deploy/canary-report-production.json`

Fluxo de branch:

- push em `main`: deploy para ambiente `production`
- execucao manual: `workflow_dispatch` para `develop` ou `production` em [.github/workflows/deploy.yml](.github/workflows/deploy.yml)

Antes de usar no GitHub, configure Environments com os mesmos nomes (`develop` e `production`) e defina:

Secrets por ambiente:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_PATH`
- `SSH_PRIVATE_KEY`

Variables por ambiente (opcionais):

- `DEPLOY_PORT` (padrao: 22)
- `DEPLOY_TIMEOUT_SECONDS` (padrao: 20)
- `DEPLOY_HEALTHCHECK_URL` (se definido, valida pos-deploy)
- `DEPLOY_CANARY_DURATION_SECONDS` (janela de observacao do canary em production)
- `DEPLOY_CANARY_PROBE_INTERVAL_SECONDS` (intervalo entre probes)
- `DEPLOY_CANARY_MAX_FAILURES` (limiar de falhas para rollback automatico)
- `DEPLOY_CANARY_SMOKE_URL` (endpoint de smoke opcional para canary)
- `DEPLOY_FAIL_ON_ROLLBACK` (falha o job quando houver rollback automatico)

Evidencias de deploy:

- `.deploy/dist/RELEASE_MANIFEST.json`
- `.deploy/deploy-result-<ambiente>.json`
- `.deploy/canary-report-production.json` (production)

Rollback operacional:

- no host remoto, o link `current` aponta para o release ativo em `DEPLOY_PATH/releases`
- o deploy de production realiza rollback automatico durante a janela canary quando probes falham
- para rollback manual, basta reapontar `current` para uma release anterior no mesmo diretorio
