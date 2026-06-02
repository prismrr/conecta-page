# Checklist de Execucao Manual por Release

Objetivo: padronizar a validacao manual de release com evidencias minimas para API, compliance e observabilidade.

Uso recomendado:

- preencher este checklist para cada release candidata (RC)
- anexar evidencias no ticket da release
- bloquear promocao quando houver item critico pendente

## Identificacao da release

- [ ] Release tag definida (ex.: `release-candidate`)
- [ ] `testRunId` definido (ex.: `RUN-YYYYMMDD-001`)
- [ ] Executor identificado (`tester`)
- [ ] Ambiente alvo definido (`local` ou `staging`)
- [ ] Janela de execucao registrada (inicio/fim)

## Pre-condicoes tecnicas

- [ ] API responde em `GET /healthz` com `200`
- [ ] OpenAPI acessivel em `GET /openapi.json`
- [ ] Workspace Insomnia importado de [qa/insomnia/conecta-api-qa.workspace.export.json](../qa/insomnia/conecta-api-qa.workspace.export.json)
- [ ] Variaveis de ambiente do Insomnia preenchidas:
  - `baseUrl`
  - `registrationId`
  - `inscricaoId`
  - `loteImportacao`
  - `dsarProtocol`
  - `testRunId`
  - `releaseTag`
  - `tester`

## Execucao manual (Insomnia)

Executar e registrar resultado para as suites:

- [ ] `Contract Assertions`
- [ ] `Smoke Assertions`
- [ ] `Regression Assertions`
- [ ] `Security Assertions`
- [ ] `Compliance Assertions`
- [ ] `Observability Assertions`

Criterio de aceite minimo:

- [ ] Nenhuma falha em `Contract Assertions` e `Smoke Assertions`
- [ ] Falhas em outras suites classificadas com risco e plano de mitigacao

## Validacoes obrigatorias por dominio

### Contrato e disponibilidade

- [ ] `GET /openapi.json` retorna `application/json` e versao OpenAPI 3.x
- [ ] `GET /api/inscricoes/{id}` validado para `200` (payload normalizado) ou `404` (`not_found`)
- [ ] `GET /api/registrations/{registrationId}` validado conforme cenario esperado da release

### Compliance e LGPD

- [ ] `POST /compliance/consent-records` validado com retorno `201`
- [ ] `GET /compliance/consent-records` confirma persistencia
- [ ] Fluxo DSAR validado ao menos em leitura (`GET /compliance/dsar-requests`)
- [ ] Quando aplicavel na release: exportacao e exclusao segura DSAR validadas
- [ ] Nenhuma evidencia com dado pessoal desnecessario em logs/capturas

### Observabilidade e telemetria

- [ ] `POST /telemetry/events` aceito com `202`
- [ ] `GET /observability/health` com `ok=true`
- [ ] `GET /observability/summary` e `GET /observability/alerts` retornam `200`
- [ ] `release_id` e `testRunId` presentes nas evidencias de correlacao

## Evidencias obrigatorias

- [ ] Captura da execucao das suites no Insomnia
- [ ] JSON/print de respostas criticas (smoke, contrato, compliance, observabilidade)
- [ ] Registro de incidentes encontrados com severidade:
  - `LOW`
  - `MEDIUM`
  - `HIGH`
  - `CRITICAL`
- [ ] Link do ticket de bug (quando houver)
- [ ] Decisao final da release documentada: `GO` ou `NO-GO`

## Gate de decisao

Bloquear release (`NO-GO`) quando qualquer condicao abaixo ocorrer:

- [ ] Falha de contrato em endpoint critico
- [ ] Falha de smoke sem mitigacao aprovada
- [ ] Quebra de fluxo de compliance obrigatorio da release
- [ ] Evidencia incompleta para rastreabilidade (`testRunId`, `releaseTag`, `tester`)

## Encerramento

- [ ] Checklist anexado ao ticket da release
- [ ] Evidencias arquivadas em `qa/evidence/releases/<releaseTag>/<testRunId>/`
- [ ] Aprovacao final registrada por QA responsavel

Referencias:

- [docs/qa-devsecops-api-testing.md](qa-devsecops-api-testing.md)
- [qa/insomnia/WORKSPACE-STRUCTURE.md](../qa/insomnia/WORKSPACE-STRUCTURE.md)
- [docs/lgpd-audit-checklist.md](lgpd-audit-checklist.md)
- [docs/manual-release-insomnia-runbook.md](manual-release-insomnia-runbook.md)
- [qa/insomnia/MANUAL-RELEASE-RUN.template.md](../qa/insomnia/MANUAL-RELEASE-RUN.template.md)
