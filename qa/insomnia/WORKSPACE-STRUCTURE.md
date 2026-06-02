# Insomnia Workspace Structure

## Export versionavel

Arquivo base para importacao no Insomnia:

- [conecta-api-qa.workspace.export.json](conecta-api-qa.workspace.export.json)

Importacao rapida:

1. Insomnia -> Create -> Import From File.
2. Selecione `qa/insomnia/conecta-api-qa.workspace.export.json`.
3. Escolha o ambiente `local` ou `staging` e ajuste apenas secrets locais.

## Suites de assertions inclusas no export

O export base ja inclui suites executaveis no Insomnia (menu Tests):

- `Smoke Assertions`
- `Regression Assertions`
- `Security Assertions`
- `Compliance Assertions`
- `Observability Assertions`
- `Contract Assertions`

Cobertura padrao das assertions:

- status code esperado
- campos obrigatorios no body JSON
- validacao de header `content-type` para JSON

## Workspace principal

`Conecta API QA`

## Collections

1. `00-Contract-First`
2. `10-Smoke`
3. `20-Regression`
4. `25-Compliance-LGPD`
5. `27-Observability`
6. `30-Security-Checks`
7. `40-Exploratory-Charters`
8. `90-Utilities`

Endpoints reais cobertos nas colecoes iniciais:

- Health: `GET /healthz`
- Registration: `GET /api/registrations/{registrationId}`
- Inscricoes: `GET /api/inscricoes/{inscricaoId}`, `GET /api/inscricoes/lotes/{loteImportacao}`
- Telemetry: `POST /telemetry/events`
- Compliance: consent records, DSAR (create/list/export/secure-delete), integration events/summary, content audit events
- Observability: `GET /observability/health`, `GET /observability/summary`, `GET /observability/alerts`
- Utilities: `GET /openapi.json`, `GET /docs`

## Ambientes

- `Base Environment`
- `local`
- `staging`

## Variáveis de ambiente

- `baseUrl`
- `authEndpoint`
- `username`
- `accessToken` (secret)
- `requestTimeoutMs`
- `correlationId`
- `registrationId`
- `inscricaoId`
- `loteImportacao`
- `dsarProtocol`
- `testRunId` (ex.: `RUN-YYYYMMDD-001`)
- `releaseTag` (ex.: `release-candidate`)
- `tester` (identificador do executor)

## Convencao de rastreabilidade

- Use sempre `X-Test-Run-Id` em requests de evidência.
- Propague `releaseTag` e `tester` em headers de charter exploratorio.
- Registre o mesmo `testRunId` no ticket de defeito para rastreabilidade ponta a ponta.

## Charter exploratório mínimo por release

- Payload inválido para campos obrigatórios.
- Validação de códigos HTTP por cenário.
- Header Authorization ausente/inválido/expirado.
- Validação de comportamento de caching e content-type.
- Verificação de mensagens de erro sem vazamento interno.

Campos obrigatorios de evidencia no charter:

- Resultado: `PASS` ou `FAIL`
- Severidade: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- Risco identificado
- Evidencia (request/response/log)
- Acao recomendada, owner e prazo

## Evidencia por release

- Template de registro: [MANUAL-RELEASE-RUN.template.md](MANUAL-RELEASE-RUN.template.md)
- Pasta padrao versionavel: `qa/evidence/releases/<releaseTag>/<testRunId>/`
- Runbook operacional: [docs/manual-release-insomnia-runbook.md](../../docs/manual-release-insomnia-runbook.md)
