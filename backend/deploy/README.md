# Backend Deploy

Scripts canonicos de build e deploy estatico do backend operacional.

## Arquivos
- [build_static.sh](./build_static.sh)
- [build_static_inside_container.sh](./build_static_inside_container.sh)
- [deploy_static.sh](./deploy_static.sh)
- [deploy_develop.sh](./deploy_develop.sh)
- [deploy_production.sh](./deploy_production.sh)
- [deploy_production_canary.sh](./deploy_production_canary.sh)

## Build em container
O build canônico agora executa dentro do container `conecta-build` via `docker compose`.

Fluxo resumido:
1. O wrapper em [build_static.sh](./build_static.sh) valida Docker e aciona `docker compose`.
2. O serviço `conecta-build` instala dependências e chama [build_static_inside_container.sh](./build_static_inside_container.sh).
3. O artefato final continua sendo escrito em `.deploy/dist` no host por montagem de volume.

Comando esperado:
- `bash backend/deploy/build_static.sh .deploy/dist`

## Cutover de producao com canary e rollback automatico
O deploy de producao usa canary operacional com promocao por symlink e rollback automatico para a release anterior quando probes falham acima do limiar.

Fluxo resumido:
1. Build e upload de nova release para `DEPLOY_PATH/releases/<release-id>`.
2. Captura da release ativa anterior (`DEPLOY_PATH/current`).
3. Promocao canary via troca atomica de symlink `current`.
4. Janela de observacao com probes em `DEPLOY_HEALTHCHECK_URL` e, opcionalmente, `DEPLOY_CANARY_SMOKE_URL`.
5. Rollback automatico para release anterior quando a contagem de falhas excede `DEPLOY_CANARY_MAX_FAILURES`.

Variaveis adicionais de canary:
- `DEPLOY_CANARY_DURATION_SECONDS` (padrao: 60)
- `DEPLOY_CANARY_PROBE_INTERVAL_SECONDS` (padrao: 10)
- `DEPLOY_CANARY_MAX_FAILURES` (padrao: 1)
- `DEPLOY_CANARY_SMOKE_URL` (opcional)
- `DEPLOY_FAIL_ON_ROLLBACK` (padrao: true)

Evidencias geradas:
- `.deploy/deploy-result-production.json`
- `.deploy/canary-report-production.json`

## Compatibilidade
Os scripts legados em [scripts/deploy](../../scripts/deploy) permanecem como wrappers para evitar quebra em integracoes existentes.
