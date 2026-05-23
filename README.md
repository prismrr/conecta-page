# Conecta PrismRR

MVP inicial do portal oficial do PRISM Conecta.

## Escopo implementado
- Pagina inicial com descricao geral do evento.
- Pagina de inscricoes com orientacoes e consulta de resultado em modo demo.
- Pagina de programacao com agenda e palestrantes.
- Pagina de privacidade com resumo de controles LGPD para o MVP.
- Banner de consentimento para cookies opcionais.

## Estrutura
- index.html
- pages/inscricoes.html
- pages/programacao.html
- pages/politica-privacidade.html
- assets/css/styles.css
- assets/js/site.js
- .SPECS/ (fonte de verdade para requisitos de produto, qualidade e compliance)

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
Arquivo de referencia: [contracts/registration-result.contract.json](contracts/registration-result.contract.json)

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

## Telemetria de eventos criticos do funil
Implementada no frontend em [assets/js/site.js](assets/js/site.js), com configuracao em [assets/js/config.js](assets/js/config.js).

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
