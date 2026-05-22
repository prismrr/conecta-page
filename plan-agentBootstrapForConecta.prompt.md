## Plan: Bootstrap de customização para agentes

Vou focar exclusivamente na criação de um arquivo único de orientação para agentes no workspace, usando os documentos já existentes como fonte de verdade e evitando duplicação de conteúdo.

**Steps**
1. Consolidar as convenções técnicas e de produto a partir de [README.md](README.md), [.SPECS/idea.md](.SPECS/idea.md), [.SPECS/PRD.md](.SPECS/PRD.md), [.SPECS/test_design.md](.SPECS/test_design.md) e [.SPECS/ldpg_design.md](.SPECS/ldpg_design.md).
2. Definir o escopo operacional para agentes: regras de execução, limites de segurança, rastreabilidade e validações mínimas antes de mudanças.
3. Estruturar um guia enxuto e acionável em um único arquivo AGENTS.md na raiz do repositório, com princípio linkar em vez de copiar. Depende do passo 1.
4. Incluir no guia as diretrizes críticas do projeto: integração externa com contrato, requisitos LGPD e estratégia de QA/AppSec. Depende dos passos 1 e 2.
5. Revisar o conteúdo para garantir objetividade, ausência de duplicação e aderência aos documentos-fonte. Depende dos passos 3 e 4.
6. Entregar o resumo final com tabela de arquivos de customização alterados e sugestões de próximos customizations opcionais. Depende do passo 5.

**Relevant files**
- [README.md](README.md) — contexto base do repositório
- [.SPECS/idea.md](.SPECS/idea.md) — visão de produto e escopo funcional
- [.SPECS/PRD.md](.SPECS/PRD.md) — requisitos técnicos e rastreabilidade
- [.SPECS/test_design.md](.SPECS/test_design.md) — padrões de qualidade, teste e AppSec
- [.SPECS/ldpg_design.md](.SPECS/ldpg_design.md) — requisitos LGPD e compliance

**Verification**
1. Verificar que foi criado apenas um arquivo de customização nesta iteração, no escopo workspace.
2. Confirmar que cada diretriz no AGENTS.md aponta para uma fonte existente em .SPECS ou README.
3. Validar que o conteúdo está conciso, acionável e sem reprodução extensa dos documentos já existentes.
4. Confirmar entrega de tabela final com justificativa prática do arquivo para agentes.

**Decisions**
- Escopo aprovado: workspace compartilhado.
- Entrega aprovada: somente AGENTS.md nesta rodada.
- Fonte de verdade: documentos em .SPECS; o AGENTS.md atua como camada de orquestração.

**Further Considerations**
1. Próxima evolução recomendada: instrução dedicada de compliance para autoaplicar regras LGPD em mudanças sensíveis.
2. Próxima evolução recomendada: instrução dedicada de testes para reforçar pirâmide de testes e controle de flakiness.
3. Próxima evolução recomendada: prompt reutilizável para rastreabilidade requisito → teste → métrica.

Plano salvo em memória de sessão e pronto para execução. Se quiser, sigo para a implementação do AGENTS.md no próximo passo.