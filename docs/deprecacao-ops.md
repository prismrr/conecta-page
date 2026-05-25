# Plano de Deprecacao do Caminho Legado ops

Status: concluido em 2026-05-24.

Este plano registrou a retirada controlada do caminho legado de observability, com migracao para o caminho canonico.

Caminho canonico atual:
- [infra/observability](../infra/observability)

## Escopo
- Descontinuar o uso direto do caminho legado de observability.
- Manter funcionamento atual enquanto consumidores migram para [infra/observability](../infra/observability).
- Garantir que nao haja regressao em comandos de desenvolvimento, CI e documentacao.

## Estado atual
- [infra/observability/docker-compose.yml](../infra/observability/docker-compose.yml) e o ponto canonico.
- Comandos npm oficiais usam caminho canonico.
- O diretorio legado foi removido.

## Cronograma executado
Data de referencia: 2026-05-24

1. Fase 1 - Comunicacao e compatibilidade (concluida)
- Marcar caminho canonico em docs e README.
- Preservar caminho legado como fallback.

2. Fase 2 - Observacao (2026-05-24)
- Auditoria de referencias internas no repositorio.
- Confirmacao de comandos oficiais no caminho canonico.

3. Fase 3 - Janela de corte (2026-05-24)
- Checklist de remocao validado.
- Remocao do diretorio legado executada.

## Criterios de saida
Todos devem ser verdadeiros antes da remocao:
- Nenhum comando oficial (README, npm scripts, workflows) referencia o caminho legado.
- Documentacao principal aponta somente para [infra/observability](../infra/observability).
- Validacao de integracao e smoke tests sem regressao.
- Nao ha dependencia externa conhecida que exija o caminho legado.

## Checklist de remocao segura
1. Confirmar ausencia de referencias:
- grep por caminho legado sem ocorrencias relevantes fora de historico documental.

2. Validar operacao local:
- Subir stack observability com [infra/observability/docker-compose.yml](../infra/observability/docker-compose.yml).
- Subir stack completa via npm e validar Grafana/Loki.

3. Validar qualidade:
- Executar testes de integracao e smoke test.
- Verificar workflows de compliance e deploy.

4. Remocao controlada:
- Remover pasta legado.
- Atualizar este plano para estado "concluido" com data de corte.

## Riscos e mitigacoes
- Risco: scripts externos ainda referenciam caminho legado.
  - Mitigacao: manter janela de observacao e comunicar data de corte.

- Risco: regressao em stack local de observability.
  - Mitigacao: validar compose e teste de integracao antes da remocao.

## Comando de auditoria sugerido
- rg -n "observability" .

## Responsavel operacional
- Time de engenharia do repositorio Conecta PrismRR.

## Relatorio de acompanhamento
- Ultima avaliacao de readiness: [docs/readiness-corte-ops.md](./readiness-corte-ops.md)
