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
- [index.html](../index.html)
- [pages](../pages)
- [assets/css](../assets/css)
- [assets/js](../assets/js)

## Responsabilidades
- Renderizacao de paginas e navegacao.
- Interacoes do usuario e estado local no navegador.
- Emissao de eventos de telemetria para o coletor backend.
- Consumo dos endpoints HTTP expostos pelo servidor local.

## Observacao
A estrutura frontend permanece em raiz (`index.html`, `pages`, `assets`) para manter compatibilidade de build estatico e deploy atual.
