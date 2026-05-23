# TODO

**Sprint 1**
1. [DONE] `PRD-RQ02` Orientações de inscrição versionadas  
Entregar estrutura de conteúdo versionado para regras, prazos e instruções, com histórico mínimo e publicação controlada.
2. [DONE] `PRD-RQ04` Cronograma com ordenação e filtros. Adicionar filtro por trilha, turno ou tema, mantendo a agenda ordenada por horário.
3. [DONE] `PRD-RQ05` Palestrantes com vínculo institucional  
Completar cards com bio curta, instituição, área e links relevantes.
4. [DONE] `PRD-RQ12` FAQ curada  
Publicar FAQ inicial baseada em conteúdo oficial para reduzir dúvidas repetitivas.

**Sprint 2**
1. `PRD-RQ06` Consentimento granular  
Substituir o banner binário por preferências por categoria.
2. `PRD-RQ07` Gestão de cookies por categoria  
Garantir controle explícito de essenciais versus opcionais, com persistência consistente.
3. `PRD-RQ11` Política e Termo versionados  
Adicionar versão, data de vigência e changelog visível.
4. `PRD-RQ09` Canal de direitos do titular  
Criar fluxo mínimo de solicitação com formulário, protocolo e instruções de atendimento.

**Sprint 3**
1. `PRD-RQ08` Auditoria de conteúdo crítico  
Registrar alteração de conteúdo relevante com autor, data e versão.
2. `PRD-RQ10` Monitoramento operacional da integração externa  
Adicionar sinais de disponibilidade, falha de provider e resumo operacional.
3. Persistência real para compliance  
Implementar base SQL mínima para consentimento, preferências e trilha de auditoria.
4. Contrato formal de integração  
Evoluir do JSON contract atual para OpenAPI versionado e teste de contrato dedicado.

**Sprint 4**
1. Acessibilidade automatizada em PR  
Adicionar `axe-core` ao pipeline.
2. VRT e hardening visual  
Adicionar visual regression para páginas críticas.
3. AppSec no CI  
Adicionar SAST, SCA e, se possível, baseline DAST.
4. Observabilidade avançada  
Estruturar destino real para telemetria, alertas básicos e correlação por release.

**Prioridade de negócio**
1. Alta: `PRD-RQ02`, `PRD-RQ04`, `PRD-RQ06`, `PRD-RQ07`, `PRD-RQ09`, `PRD-RQ11`, `PRD-RQ12`
2. Média: `PRD-RQ05`, `PRD-RQ08`, `PRD-RQ10`
3. Estrutural: SQL de compliance, OpenAPI + contract test, AppSec e observabilidade avançada

**Critério prático de corte para MVP**
O MVP pode ser considerado funcional quando tiver:
1. Home, inscrições, cronograma e palestrantes completos
2. Resultado com integração e fallback resiliente
3. Consentimento granular funcionando
4. Política/termo versionados
5. FAQ curada
6. Testes e CI cobrindo fluxo crítico