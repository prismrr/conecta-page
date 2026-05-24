# Conecta PrismRR

MVP inicial do portal oficial do PRISM Conecta.

## Escopo implementado
- Pagina inicial com descricao geral do evento.
- Pagina de inscricoes com orientacoes versionadas e consulta de resultado em modo demo.
- Pagina de programacao com agenda ordenada por horario, filtros por trilha e turno, e palestrantes.
- Pagina de FAQ curada com respostas oficiais.
- Pagina de privacidade com resumo de controles LGPD para o MVP.
- Preferencias de consentimento granulares e revogaveis por categoria.

## Estrutura
- index.html
- pages/inscricoes.html
- pages/programacao.html
- pages/faq.html
- pages/politica-privacidade.html
- assets/css/styles.css
- assets/js/registration-guidance.js
- assets/js/faq-data.js
- assets/js/site.js
- .SPECS/ (fonte de verdade para requisitos de produto, qualidade e compliance)

## Orientacoes de inscricao versionadas
As versoes publicadas da chamada ficam em [assets/js/registration-guidance.js](assets/js/registration-guidance.js).

O modelo atual define:

- `currentVersionId`: versao vigente exibida na pagina
- `versions`: historico de versoes publicadas com vigencia, autoria, aprovacao e changelog

Ao atualizar a chamada, publique uma nova entrada e mova o `currentVersionId` para a versao aprovada.

## Agenda filtravel
As sessoes da pagina [pages/programacao.html](pages/programacao.html) ficam em [assets/js/schedule-data.js](assets/js/schedule-data.js).

O frontend ordena o cronograma por `startTime` e permite filtrar por:

- `track`
- `period`

Ao adicionar uma nova sessao, informe ao menos `startTime`, `endTime`, `title`, `track` e `period` para manter a agenda consistente.

Os perfis de palestrantes da mesma pagina tambem sao dirigidos por [assets/js/schedule-data.js](assets/js/schedule-data.js).

Cada perfil aceita:

- `name`
- `institution`
- `area`
- `bio`
- `links[]`

## FAQ curada
A FAQ publicada em [pages/faq.html](pages/faq.html) usa como fonte [assets/js/faq-data.js](assets/js/faq-data.js).

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
Os documentos legais versionados sao renderizados a partir de [assets/js/legal-documents.js](assets/js/legal-documents.js).

Paginas:

- [pages/politica-privacidade.html](pages/politica-privacidade.html)
- [pages/termos-uso.html](pages/termos-uso.html)

Cada documento exibe:

- versao vigente
- data de vigencia
- changelog visivel por versao publicada

## Canal de direitos do titular (PRD-RQ09)
Canal minimo implementado em [pages/politica-privacidade.html](pages/politica-privacidade.html) com:

- formulario de solicitacao por tipo (acesso, correcao, exclusao, exportacao, revogacao)
- geracao imediata de protocolo no formato `DSAR-YYYYMMDD-XXXXXX`
- instrucoes de atendimento e prazo inicial de resposta

Registro local de protocolo:

- chave `conecta_dsar_requests_v1`
- armazenamento minimizado (sem persistir email informado no formulario)

## Trilha de auditoria de conteudo critico (PRD-RQ08)
A trilha de auditoria e renderizada em [pages/politica-privacidade.html](pages/politica-privacidade.html) a partir de [assets/js/content-audit-log.js](assets/js/content-audit-log.js).

Cada evento registra:

- autor
- data da alteracao
- versao publicada
- protocolo de auditoria

O fluxo foi modelado como append-only no lado do cliente para manter historico de alteracoes criticas no MVP estatico.

## Monitoramento operacional da integracao externa (PRD-RQ10)
O monitoramento operacional foi adicionado em [pages/inscricoes.html](pages/inscricoes.html), com atualizacao pelo fluxo de consulta em [assets/js/site.js](assets/js/site.js).

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
Foi adicionada persistencia SQL minima via SQLite no servidor local [scripts/dev_server.py](scripts/dev_server.py), com base padrao em `data/compliance.db`.

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

- [assets/js/site.js](assets/js/site.js) persiste atualizacoes de consentimento no endpoint SQL
- resumo operacional da integracao externa passa a ser hidratado do endpoint `integration-summary`
- trilha de auditoria tenta carregar eventos do endpoint SQL com fallback para dataset local

## Executar localmente
Opcao 1: abrir index.html diretamente no navegador.

Opcao 2: servidor local com coletor de telemetria:

python3 scripts/dev_server.py --port 8080

Depois acesse:

http://localhost:8080

Opcao 3: servidor estatico simples (sem endpoint de telemetria):

python3 -m http.server 8080

Depois acesse:

http://localhost:8080

## Proximo incremento sugerido
- Integrar consulta de inscricao com endpoint real e validacao de contrato.
- Instrumentar eventos de telemetria do funil principal.
- Adicionar suite de testes automatizados (unitario, integracao e E2E).

## Integracao real de consulta de inscricao
O fluxo de consulta em [pages/inscricoes.html](pages/inscricoes.html) ja usa requisicao HTTP real com retry, timeout e validacao de contrato.

### 1. Configurar endpoint
Edite [assets/js/config.js](assets/js/config.js):

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
Implementada no frontend em [assets/js/site.js](assets/js/site.js), com configuracao em [assets/js/config.js](assets/js/config.js).

## Acessibilidade automatizada em PR (Sprint 4 item 1)
Foi adicionada validacao automatizada com axe-core via Playwright para paginas criticas:

- `/index.html`
- `/pages/inscricoes.html`
- `/pages/programacao.html`
- `/pages/politica-privacidade.html`

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
Foi estruturada uma camada de observabilidade no servidor local [scripts/dev_server.py](scripts/dev_server.py) com:

- destino real opcional para forwarding de telemetria
- alertas basicos por limiar de falhas de sincronizacao externa
- correlacao de eventos por `release_id`

Configuracao por argumentos do servidor:

- `--telemetry-forward-url` destino HTTP externo (opcional)
- `--alert-failure-threshold` limiar de disparo de alerta (padrao 3)
- `--alert-window-minutes` janela de avaliacao do alerta (padrao 15)

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

### Eventos emitidos
- page_view
- cta_click
- registration_guideline_view
- registration_result_view
- consent_granted
- consent_revoked
- external_data_sync_failed

### Configuracao
Em [assets/js/config.js](assets/js/config.js), ajuste o bloco `telemetry`:

- enabled: ativa ou desativa emissao
- endpointUrl: endpoint HTTP para coleta
- environment: ambiente (development, staging, production)
- releaseId: identificador da versao
- sourceChannel: canal de origem (web)
- consoleDebug: imprime payload no console para validacao local

Se `endpointUrl` estiver vazio, os eventos permanecem disponiveis em `window.dataLayer` para inspecao local.

### Coleta local real
Com `endpointUrl` configurado para `/telemetry/events`, execute o servidor de dev:

python3 scripts/dev_server.py --port 8080

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
- inicia `scripts/dev_server.py` automaticamente se necessario
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

## CI automatizado (GitHub Actions)
Workflow configurado em [.github/workflows/ci.yml](.github/workflows/ci.yml).

Executa automaticamente em `pull_request` e `push` para `main`:

- npm run test:unit
- npm run test:integration
- npm run test:e2e
- npm run test:smoke

Em caso de falha, o workflow faz upload de artefatos para diagnostico:

- `playwright-artifacts` (traces e resultados E2E)
- `telemetry-logs-sanitized` (logs de telemetria com IP mascarado e campos sensiveis reduzidos)
