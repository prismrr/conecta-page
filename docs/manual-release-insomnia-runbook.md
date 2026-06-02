# Runbook de Execucao Manual por Release (Insomnia)

Este runbook fecha as pendencias operacionais do item Testes Manuais e Exploratorios com Insomnia.

## 1. Preparar contexto da release

1. Defina `releaseTag`, `testRunId` e `tester`.
2. Abra o workspace Insomnia: `qa/insomnia/conecta-api-qa.workspace.export.json`.
3. Selecione o ambiente (`local` ou `staging`).
4. Atualize variaveis operacionais: `registrationId`, `inscricaoId`, `loteImportacao`, `dsarProtocol`.

## 2. Executar suites obrigatorias

Execute no menu Tests do Insomnia:

1. Contract Assertions
2. Smoke Assertions
3. Regression Assertions
4. Security Assertions
5. Compliance Assertions
6. Observability Assertions

## 3. Coletar evidencia minima

1. Salve captura de tela ou export dos resultados das suites.
2. Salve respostas JSON de endpoints criticos (contract, smoke, compliance, observability).
3. Registre defeitos com severidade LOW/MEDIUM/HIGH/CRITICAL.

## 4. Registrar resultado no repositorio

1. Copie o template `qa/insomnia/MANUAL-RELEASE-RUN.template.md`.
2. Salve como `qa/evidence/releases/<releaseTag>/<testRunId>/manual-release-run.md`.
3. Anexe no mesmo diretorio os arquivos de evidencia.
4. Atualize o ticket da release com link para a pasta de evidencia.

## 5. Aplicar gate GO/NO-GO

Marque NO-GO se ocorrer qualquer condicao:

- Falha de contrato em endpoint critico.
- Falha de smoke sem mitigacao aprovada.
- Quebra de fluxo de compliance obrigatorio.
- Evidencia incompleta de rastreabilidade (`testRunId`, `releaseTag`, `tester`).

Referencias:

- [docs/checklist-execucao-manual-release.md](checklist-execucao-manual-release.md)
- [qa/insomnia/WORKSPACE-STRUCTURE.md](../qa/insomnia/WORKSPACE-STRUCTURE.md)
