# Frontend

Camada de interface estatica do portal Conecta PrismRR.

## Trilha de migracao Nuxt 3

O bootstrap inicial da migracao foi iniciado em `nuxt-app/` com:

- Nuxt 3 configurado para SSG.
- Rotas equivalentes as paginas legadas.
- Estado global inicial com Pinia (`consent` e `registration`).

Comandos:

- `npm run nuxt:dev`
- `npm run nuxt:generate`
- `npm run nuxt:preview`

## Fontes canonicas
- [nuxt-app](../nuxt-app)
- [nuxt-app/pages](../nuxt-app/pages)
- [nuxt-app/components](../nuxt-app/components)
- [nuxt-app/stores](../nuxt-app/stores)

## Legado (somente referencia historica)
O frontend HTML/JS legado foi descomissionado e nao faz mais parte do artefato canônico.

## Responsabilidades
- Renderizacao de paginas e navegacao.
- Interacoes do usuario e estado local no navegador.
- Emissao de eventos de telemetria para o coletor backend.
- Consumo dos endpoints HTTP expostos pelo servidor local.

## Observacao
O deploy canonico passou a empacotar apenas o artefato Nuxt SSG (`nuxt-app/.output/public`).
Os arquivos de frontend legados permanecem apenas no historico Git para rastreabilidade e rollback controlado.
