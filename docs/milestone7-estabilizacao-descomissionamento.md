# Milestone 7: Estabilizacao Final e Descomissionamento do Legado

Status: concluido.

## Objetivo
Consolidar Nuxt 3 SSG como baseline unico de entrega em deploy e qualidade, mantendo rollback operacional seguro e minimizando risco de regressao durante a retirada da trilha legacy.

## Entregas implementadas

1. Build canonico de release migrado para Nuxt SSG
- O empacotamento de deploy agora usa apenas `nuxt-app/.output/public`.
- O script de build executa `nuxt:generate` antes da publicacao do payload.
- Foi adicionada validacao de guardrail para impedir inclusao acidental de artefatos legacy no pacote.

Arquivo:
- [backend/deploy/build_static.sh](../backend/deploy/build_static.sh)

2. Baseline de E2E migrado para Nuxt
- O comando padrao `test:e2e` passa a executar a suite Nuxt.
- A suite legacy permanece disponivel sob comando explicito para suporte controlado.

Arquivo:
- [package.json](../package.json)

3. Gate de deploy estabilizado para Nuxt
- Workflow de deploy (develop e production) valida:
  - unit + integration
  - `nuxt:generate`
  - `test:e2e` (baseline Nuxt)

Arquivo:
- [.github/workflows/deploy.yml](../.github/workflows/deploy.yml)

4. Cutover com rollback operacional preservado
- Deploy de production segue canary + rollback automatico por symlink, implementado no milestone anterior, mantendo reversibilidade durante e apos descomissionamento.

Arquivos:
- [backend/deploy/deploy_production_canary.sh](../backend/deploy/deploy_production_canary.sh)
- [backend/deploy/deploy_production.sh](../backend/deploy/deploy_production.sh)

## Modo de descomissionamento adotado
- Estrategia: descomissionamento funcional do legado, sem exclusao destrutiva imediata de arquivos historicos.
- Racional: manter rollback documental e rastreabilidade, enquanto bloqueia uso acidental do legado em build/deploy.

## Evidencias de conformidade e qualidade
- Build de release com marcador `frontendTrack: nuxt-ssg` no manifest.
- Guardrail de build falha se artefatos legacy aparecerem no pacote final.
- Pipeline de deploy exige validacao de SSG e E2E Nuxt antes de promover release.

## Rastreabilidade
- PRD-RQ10: observabilidade e operacao resiliente preservadas no cutover.
- PRD-RQ12: qualidade de entrega e gate operacional fortalecidos.
- PRD-RQ06/07/11: fluxos de consentimento e compliance mantidos na trilha Nuxt validada.

## Proximos passos recomendados (pos-milestone)
1. Remover definitivamente suites e paginas legacy quando houver janela aprovada de limpeza de historico.
2. Migrar VRT e a11y para suite Nuxt dedicada, para eliminar dependencia de configuracoes legacy remanescentes.
