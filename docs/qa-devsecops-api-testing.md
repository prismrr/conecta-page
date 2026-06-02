# QA e DevSecOps para API

Este documento define a implementação prática dos quatro pilares de qualidade contínua para APIs no projeto.

## 1. Testes manuais e exploratórios (Insomnia)

### Estrutura recomendada

- `00-Contract-First`
- `10-Smoke`
- `20-Regression`
- `25-Compliance-LGPD`
- `27-Observability`
- `30-Security-Checks`
- `40-Exploratory-Charters`
- `90-Utilities`

### Ambientes

- `Base Environment`
- `local`
- `staging`

### Variáveis obrigatórias por ambiente

- `baseUrl`
- `authEndpoint`
- `accessToken` (somente secret)
- `requestTimeoutMs`
- `registrationId`
- `inscricaoId`
- `loteImportacao`
- `dsarProtocol`
- `testRunId`
- `releaseTag`
- `tester`

Observacao:

- `dev` e `prod-readonly` podem ser adicionados como ambientes derivados quando houver necessidade operacional, mas nao fazem parte do export base atual versionado.

### Checklist exploratório mínimo

- Validar payload inválido por tipo e campo obrigatório.
- Verificar códigos HTTP esperados (200, 201, 400, 401, 403, 404, 409, 422, 429).
- Verificar headers obrigatórios e ausência de dados sensíveis em erro.
- Testar token ausente, inválido e expirado.

## 2. Automação funcional (Karate)

Implementação em `tests/api/karate` com:

- `karate-config.js`
- suíte funcional em `features/inscricoes-upsert.feature`
- runner JUnit5 em `runners/KarateApiTest.java` com suporte a filtro por tags (`-Dkarate.tags`)

Execução:

`cd tests/api/karate && mvn test`

Execução por tag (smoke/regression/compliance):

- `npm run test:api:functional:karate:smoke`
- `npm run test:api:functional:karate:regression`
- `npm run test:api:functional:karate:compliance`

Execução local completa com bootstrap automático da API:

`npm run test:api:functional:karate:local`

Execução local por tag:

`npm run test:api:functional:karate:local:smoke`

- `npm run test:api:functional:karate:local:regression`
- `npm run test:api:functional:karate:local:compliance`

Cobertura funcional atual da suíte Karate:

- `GET /healthz`
- `GET /api/registrations/{registrationId}` (sucesso e not_found)
- `POST /telemetry/events` (payload válido e inválido)
- `GET /api/inscricoes/{id}` (not_found)
- `GET /api/inscricoes/lotes/{loteImportacao}` (200 ou batch_not_found)
- Compliance:
  - `POST/GET /compliance/consent-records`
  - `GET /compliance/dsar-requests`
  - `POST /compliance/integration-events`
  - `GET /compliance/integration-summary`
  - `POST/GET /compliance/content-audit-events`
- Observability:
  - `GET /observability/health`
  - `GET /observability/summary`
  - `GET /observability/alerts`

## 3. Carga e performance (k6)

Implementação inicial em `tests/performance/k6/api-load.js` com:

- ramp-up: 2m até 20 VUs
- stress: 5m com 100 VUs
- cool-down: 2m até 0

Thresholds padrão:

- `http_req_failed < 1%`
- `p95 < 500ms`

Execução:

`BASE_URL=http://127.0.0.1:8080 k6 run tests/performance/k6/api-load.js`

Execução local completa com bootstrap automático da API:

`npm run test:api:performance:k6:local`

## 4. Segurança (OWASP ZAP)

Implementação inicial via script em `scripts/zap_api_scan.sh`.

Entradas:

- OpenAPI em `contracts/openapi/inscricoes.v1.0.0.openapi.json`
- alvo padrão `http://127.0.0.1:8080`

Saídas:

- `logs/zap/zap-api-report.html`
- `logs/zap/zap-api-report.json`
- `logs/zap/zap-api-report.xml`

Execução:

`bash scripts/zap_api_scan.sh`

Execução local completa com bootstrap automático da API e OpenAPI efetivo:

`npm run test:api:security:zap:local`

## Critérios de gate recomendados

- Segurança: bloquear em severidade crítica/alta.
- Funcional: bloquear em falha de cenário crítico.
- Performance: bloquear quando `error rate >= 1%` ou `p95 >= 500ms`.
- Manuais: bloquear release sem evidência mínima de smoke exploratório.

Checklist manual por release:

- [docs/checklist-execucao-manual-release.md](checklist-execucao-manual-release.md)
- [docs/manual-release-insomnia-runbook.md](manual-release-insomnia-runbook.md)
- [qa/insomnia/MANUAL-RELEASE-RUN.template.md](../qa/insomnia/MANUAL-RELEASE-RUN.template.md)

Pasta padrao de evidencia versionavel:

- `qa/evidence/releases/<releaseTag>/<testRunId>/`

## Workflow de execução no GitHub Actions

Foi adicionado um workflow manual para executar os gates de API de forma controlada:

- `.github/workflows/api-quality-gates.yml`

Entrada suportada no disparo manual:

- `base_url`
- `openapi_file`

Observacao:

- quando `base_url` nao for informado, os jobs `performance-k6` e `security-zap` sobem FastAPI local automaticamente em `http://127.0.0.1:8080`.

Jobs executados:

- `functional-karate-smoke`
- `functional-karate-regression`
- `functional-karate-compliance`
- `performance-k6`
- `security-zap`

Detalhe operacional:

- `functional-karate-smoke` sobe o FastAPI local automaticamente no job, aguarda `GET /healthz` e executa os cenarios `@smoke` do Karate contra `http://127.0.0.1:8080`.
- `functional-karate-regression` sobe o FastAPI local automaticamente no job, aguarda `GET /healthz` e executa os cenarios `@regression` do Karate contra `http://127.0.0.1:8080`.
- `functional-karate-compliance` sobe o FastAPI local automaticamente no job, aguarda `GET /healthz` e executa os cenarios `@compliance` do Karate contra `http://127.0.0.1:8080`.
- `performance-k6` sobe FastAPI local automaticamente quando nao ha `base_url` remoto e executa o script k6 contra localhost.
- `security-zap` sobe FastAPI local automaticamente quando nao ha `base_url` remoto e gera um OpenAPI efetivo com `servers.url` apontando para o alvo antes do scan.
