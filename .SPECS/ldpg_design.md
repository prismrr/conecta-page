# Especificação LGPD by Design para o sistema Conecta PrismRR
Base de análise: [ idea.md ](.SPECS/idea.md).  
Contexto considerado: website estático de evento com formulário/resultado de inscrição em sistema terceiro, páginas de cronograma e palestrantes, analytics, e canais de comunicação.

## Premissas de Arquitetura e Dados
- Aplicação web responsiva (com possível app mobile no futuro).
- Coleta direta mínima: nome, e-mail institucional, vínculo, preferências de comunicação.
- Dados de inscrição podem vir de API externa.
- Uso de cookies/SDKs para métricas.
- Operação no Brasil, sujeita à LGPD e atos da ANPD.

---

# 1. Requisitos de Conformidade LGPD para o Sistema

## Matriz de requisitos funcionais e não funcionais
| ID | Nome do requisito | Descrição detalhada | Objetivo | Base legal relacionada | Artigos LGPD | Critério de aceitação |
|---|---|---|---|---|---|---|
| LGPD-RF01 | Coleta mínima de dados | Coletar apenas dados estritamente necessários por fluxo (inscrição, contato, certificado). | Minimização de risco e aderência ao princípio da necessidade. | Execução de contrato, obrigação legal, consentimento (quando aplicável). | Art. 6, III; Art. 7 | Cada campo do formulário tem finalidade documentada e aprovada pelo DPO/compliance. |
| LGPD-RF02 | Aviso de privacidade em camadas | Exibir resumo no ponto de coleta e link para política completa. | Transparência e consentimento informado. | Consentimento; legítimo interesse (com LIA quando cabível). | Art. 9; Art. 6, VI | 100% dos pontos de coleta exibem aviso resumido + link detalhado. |
| LGPD-RF03 | Consentimento granular | Consentimentos separados por finalidade (ex.: e-mail operacional, marketing, analytics opcional). | Evitar consentimento genérico e inválido. | Consentimento. | Art. 8; Art. 7, I | Checkboxes independentes, desmarcados por padrão, com prova de aceite versionada. |
| LGPD-RF04 | Gestão de preferências | Central de privacidade para alterar permissões a qualquer momento. | Garantir controle do titular. | Consentimento; legítimo interesse (opt-out quando aplicável). | Art. 8, §5; Art. 18, IX | Mudança de preferência refletida em até 24h em todos os serviços integrados. |
| LGPD-RF05 | Registro de consentimento | Armazenar: titular, finalidade, versão do texto, timestamp, IP/agent, canal de coleta. | Evidência de conformidade e auditabilidade. | Consentimento. | Art. 8, §2; Art. 37 | Auditoria consegue reconstruir histórico completo de consentimento por titular. |
| LGPD-RF06 | Revogação de consentimento | Permitir revogação simples no sistema e em comunicações (ex.: unsubscribe). | Cumprir direito de revogação e reduzir risco regulatório. | Consentimento. | Art. 8, §5; Art. 18, IX | Revogação processada sem fricção, com confirmação ao usuário e trilha de auditoria. |
| LGPD-RF07 | Compartilhamento com terceiros | Catálogo de terceiros com finalidade, base legal, localização e salvaguardas contratuais. | Transparência e governança de operadores. | Execução de contrato, legítimo interesse, obrigação legal, consentimento. | Art. 7; Art. 39; Art. 33 | Política lista terceiros e contrato inclui cláusulas de proteção de dados. |
| LGPD-RF08 | Retenção e descarte | Tabela de temporalidade por categoria de dado e rotina automatizada de exclusão/anomização. | Evitar retenção excessiva. | Obrigação legal/regulatória, exercício regular de direitos, consentimento. | Art. 15; Art. 16 | Jobs de retenção executam periodicamente e geram relatório de descarte. |
| LGPD-RF09 | Direitos do titular (DSAR) | Fluxo para acesso, correção, portabilidade, anonimização/bloqueio, eliminação e informação de compartilhamento. | Atender Art. 18 com rastreabilidade. | Direitos do titular. | Art. 18; Art. 19 | Solicitações recebem protocolo, SLA e resposta dentro do prazo definido. |
| LGPD-RF10 | Segurança no tratamento | Controles técnicos e administrativos de proteção contra acesso não autorizado e vazamentos. | Reduzir incidente e dano ao titular. | Obrigação legal de segurança. | Art. 46; Art. 49; Art. 50 | Checklist de segurança aprovado e evidências de testes periódicos. |
| LGPD-RF11 | Controle de acesso por perfil | RBAC/ABAC para painel administrativo e integrações. | Limitar exposição interna de dados. | Legítimo interesse e obrigação de segurança. | Art. 6, VII; Art. 46 | Usuário só acessa dados necessários ao papel; revisão trimestral de acessos. |
| LGPD-RF12 | Comunicação de incidente | Plano para notificação à ANPD e titulares em prazo razoável, com conteúdo mínimo. | Cumprir obrigação legal e reduzir impacto. | Obrigação legal/regulatória. | Art. 48 | Procedimento testado por simulação anual e playbook aprovado. |
| LGPD-RF13 | Tratamento de dados sensíveis | Bloquear coleta de dados sensíveis salvo estrita necessidade e base legal específica. | Evitar tratamento indevido de alto risco. | Hipóteses do Art. 11. | Art. 11 | Formulários não aceitam campos sensíveis sem aprovação formal de impacto. |
| LGPD-RF14 | Cookies e analytics | Banner/categorias, consent mode e bloqueio prévio de cookies não essenciais. | Transparência e controle do titular. | Consentimento; legítimo interesse (estritamente necessário). | Art. 7, I e IX; Art. 8; Art. 9 | Tags de marketing só disparam após opt-in; log de preferências ativo. |
| LGPD-RF15 | E-mail marketing | Opt-in específico, prova de origem do contato e opt-out em um clique. | Evitar spam e base legal inválida. | Consentimento; legítimo interesse com avaliação (quando cabível). | Art. 7; Art. 8; Art. 18, IX | Todas campanhas têm link de descadastro e supressão efetiva em até 48h. |
| LGPD-RF16 | Anúncios personalizados | Personalização apenas com consentimento explícito e possibilidade de oposição. | Reduzir risco reputacional/regulatório. | Consentimento. | Art. 7, I; Art. 18, §2 | Sem consentimento, operar somente anúncios contextuais não rastreáveis. |
| LGPD-RF17 | Integrações e APIs externas | Exigir DPA, avaliação de segurança e minimização de payload em integrações. | Conter risco de cadeia de terceiros. | Execução de contrato, legítimo interesse, obrigação legal. | Art. 33; Art. 37; Art. 46 | Toda integração possui inventário, classificação de risco e contrato vigente. |
| LGPD-RF18 | Transparência contínua | Página “Como tratamos seus dados” com atualização de versões e changelog. | Prestação de contas e confiança do usuário. | Responsabilização e transparência. | Art. 6, VI e X | Versionamento público de políticas e histórico de alterações disponível. |
| LGPD-RNF01 | Criptografia e gestão de chaves | Criptografia em trânsito e em repouso, com rotação de chaves e segregação de ambientes. | Proteger confidencialidade e integridade. | Obrigação de segurança. | Art. 46 | TLS forte, chaves rotacionadas e evidência de compliance técnico. |
| LGPD-RNF02 | Observabilidade e trilha de auditoria | Logs imutáveis de acesso, consentimento e operações sensíveis, com retenção controlada. | Detectar abuso e sustentar auditoria. | Responsabilização e segurança. | Art. 37; Art. 46; Art. 50 | Logs assinados/imutáveis, consulta auditável e alertas ativos. |
| LGPD-RNF03 | Resiliência e continuidade | Backup criptografado, testes de restauração e RTO/RPO definidos. | Reduzir impacto operacional e perda de dados. | Segurança e prevenção. | Art. 46; Art. 50 | Teste de restauração semestral com sucesso e relatório aprovado. |

---

# 2. Requisitos para Termo de Uso e Política de Privacidade

## Requisitos obrigatórios
- LGPD-DOC01: O sistema deve publicar Termo de Uso, Política de Privacidade, Aviso de Consentimento e Banner de Cookies (quando aplicável).
- LGPD-DOC02: Linguagem simples, objetiva, sem jargão jurídico não explicado.
- LGPD-DOC03: Listagem exata dos dados coletados por fluxo.
- LGPD-DOC04: Finalidade específica por dado/coleta.
- LGPD-DOC05: Prazo de retenção por categoria de dado.
- LGPD-DOC06: Regras de compartilhamento com terceiros (quem, por quê, por quanto tempo).
- LGPD-DOC07: Seções específicas para e-mail marketing, anúncios personalizados, parceiros e analytics.
- LGPD-DOC08: Instruções claras para exclusão, revogação, exportação e atualização cadastral.
- LGPD-DOC09: Canal do encarregado/DPO e contato para exercício de direitos.
- LGPD-DOC10: Medidas de segurança adotadas em nível compreensível ao usuário.

## Critério de aceite documental
- Versão, data de vigência e histórico de mudanças visíveis.
- Aceite versionado armazenado quando houver base em consentimento.
- Política acessível em até 1 clique a partir do rodapé e nos pontos de coleta.

---

# 3. Bases Legais da LGPD por Cenário

| Cenário | Base legal recomendada | Justificativa jurídica | Riscos associados | Cuidados de conformidade |
|---|---|---|---|---|
| Cadastro de usuários | Execução de contrato (Art. 7, V) | Necessário para prestação do serviço do evento. | Coleta excessiva. | Minimização de campos e finalidade explícita. |
| Login/autenticação | Execução de contrato + segurança | Necessário para acesso seguro à conta/área restrita. | Vazamento de credenciais. | MFA opcional, hash forte, monitoramento de fraude. |
| Envio de e-mails transacionais | Execução de contrato/legítimo interesse | Comunicação essencial (confirmação, alterações). | Confusão com marketing. | Separar canal transacional de promocional. |
| Marketing por e-mail | Consentimento (Art. 7, I) | Finalidade não essencial ao serviço principal. | Consentimento inválido. | Opt-in granular, prova e opt-out simples. |
| Personalização de anúncios | Consentimento | Perfilamento e rastreamento exigem controle do titular. | Alto risco reputacional. | Opt-in prévio, consent mode e opção de recusa. |
| Compartilhamento com terceiros | Contrato, legítimo interesse, obrigação legal ou consentimento (caso) | Depende da finalidade e necessidade. | Transferência sem base válida. | DPA, inventário de terceiros, due diligence. |
| Obrigações legais/regulatórias | Obrigação legal (Art. 7, II) | Cumprimento de dever normativo. | Uso além do necessário. | Segregar uso legal de uso comercial. |
| Emissão de documentos fiscais | Obrigação legal | Exigência tributária. | Retenção indefinida indevida. | Tabela de retenção e descarte após prazo legal. |
| Atendimento e suporte | Legítimo interesse ou execução de contrato | Suporte necessário para qualidade do serviço. | Acesso indevido por atendentes. | RBAC, gravação de trilha e mascaramento de dados. |
| Analytics e métricas | Legítimo interesse (agregado) ou consentimento (cookies não essenciais) | Melhoria contínua do serviço. | Rastreamento excessivo. | Preferir dados agregados/anonimizados e opção de opt-out. |

---

# 4. Princípios da LGPD a destacar ao usuário

| Princípio | Explicação simples | Aplicação no sistema | Exemplo prático |
|---|---|---|---|
| Finalidade | Seus dados têm uso específico e informado. | Cada formulário mostra para que cada campo será usado. | E-mail usado para confirmação de inscrição, não para anúncio sem opt-in. |
| Adequação | O uso dos dados combina com o que foi prometido. | Bloqueio técnico de uso fora da finalidade declarada. | Dados de suporte não entram em campanha de marketing. |
| Necessidade | Coletamos só o mínimo necessário. | Revisão periódica de formulários e remoção de campos supérfluos. | Não pedir CPF se não houver obrigação legal. |
| Livre acesso | Você pode consultar seus dados facilmente. | Área de privacidade com visualização/exportação. | Usuário baixa seus dados em formato estruturado. |
| Qualidade dos dados | Dados devem estar corretos e atualizados. | Fluxo de correção cadastral e validação de entradas. | Usuário corrige e-mail e recebe confirmação. |
| Transparência | Regras de uso devem ser claras. | Política em linguagem simples e avisos em camadas. | Banner explica cookies por categoria. |
| Segurança | Protegemos dados contra vazamentos e acessos indevidos. | Criptografia, RBAC, monitoramento e resposta a incidentes. | Tentativa suspeita de acesso gera bloqueio e alerta. |
| Prevenção | Evitamos problemas antes de acontecerem. | DPIA, testes de segurança e revisão de terceiros. | Nova integração só entra após avaliação de risco. |
| Não discriminação | Dados não podem gerar tratamento injusto. | Proibição de segmentações discriminatórias em campanhas. | Não usar atributos sensíveis para excluir grupos. |
| Responsabilização e prestação de contas | A organização prova que cumpre a lei. | Logs, relatórios de conformidade e governança ativa. | Auditoria demonstra consentimento e base legal por operação. |

---

# 5. Checklist de Segurança e Boas Práticas

| Item obrigatório | Objetivo | Como implementar | Riscos mitigados |
|---|---|---|---|
| Criptografia de dados | Proteger confidencialidade | TLS 1.2+, criptografia em repouso, KMS e rotação | Interceptação, vazamento em mídia física/lógica |
| Controle de acesso por perfil | Limitar exposição interna | RBAC/ABAC, MFA admin, revisão trimestral | Acesso indevido, abuso interno |
| Logs e auditoria | Rastrear ações e evidenciar conformidade | Logs imutáveis, SIEM, trilha por usuário/ação | Fraude sem rastreio, dificuldade forense |
| Backup seguro | Garantir recuperação | Backup criptografado, cópia offsite, teste de restore | Perda irreversível, indisponibilidade |
| Gestão de consentimento | Validar base legal | Consentimento granular, versionado e revogável | Tratamento sem base legal |
| Política de retenção | Evitar acúmulo indevido | Tabela temporal + automação de descarte | Risco regulatório por retenção excessiva |
| Anonimização/pseudonimização | Reduzir risco em análises | Tokenização, mascaramento e agregação | Reidentificação e exposição indevida |
| Plano de resposta a incidentes | Resposta rápida e coordenada | Playbooks, war-room, simulações | Atraso de notificação, ampliação de dano |
| Treinamento da equipe | Diminuir erro humano | Capacitação contínua e trilha por perfil | Phishing, uso inadequado de dados |
| Gestão de vulnerabilidades | Reduzir superfície de ataque | SAST/DAST/SCA, patching com SLA | Exploração de falhas conhecidas |

---

# 6. Direitos dos Titulares dos Dados

## Direitos previstos (núcleo operacional)
- Confirmação da existência de tratamento.
- Acesso aos dados.
- Correção de dados incompletos/inexatos.
- Anonimização, bloqueio ou eliminação de dados desnecessários/excessivos.
- Portabilidade.
- Eliminação de dados tratados com consentimento.
- Informação sobre compartilhamento.
- Informação sobre possibilidade de não consentir e consequências.
- Revogação do consentimento.
Base principal: Art. 18 e Art. 19.

## Como o sistema deve viabilizar
- Portal de privacidade com autenticação forte.
- Formulário DSAR com protocolo automático.
- Status da solicitação em etapas: recebida, em validação, concluída.
- Exportação em formato estruturado e legível.

## Fluxo recomendado de atendimento
1. Recebimento e protocolo.
2. Verificação de identidade.
3. Classificação do pedido e base legal.
4. Execução técnica (consulta, correção, exclusão, exportação).
5. Resposta ao titular com evidência do atendimento.
6. Registro final para auditoria.

## Prazos recomendados
- Resposta simplificada imediata quando possível.
- Declaração completa em até 15 dias, salvo necessidade justificada e comunicação transparente ao titular.
- Revogação de consentimento com efeito operacional rápido (meta interna: até 24h para sistemas primários).

## Registros necessários para auditoria
- Protocolo, identidade validada, tipo de solicitação.
- Data/hora, responsável, sistemas impactados.
- Evidência de execução e comunicação enviada ao titular.
- Base legal e eventual justificativa de negativa parcial.

---

# 7. Requisitos Técnicos de Implementação

## APIs
- LGPD-TEC01: API Gateway com autenticação, rate limit e escopo por finalidade.
- LGPD-TEC02: Payload mínimo e mascaramento em respostas.
- LGPD-TEC03: Versionamento de contratos e validação de esquema.

## Banco de dados
- LGPD-TEC04: Separação entre dados de identificação e dados operacionais.
- LGPD-TEC05: Criptografia em repouso e segregação por ambiente.
- LGPD-TEC06: Jobs de retenção e exclusão segura automatizados.

## Logs e consentimento versionado
- LGPD-TEC07: Registro de aceite com hash da versão do texto.
- LGPD-TEC08: Logs imutáveis para consentimento, acesso e exportação de dados.

## Sessões/autenticação
- LGPD-TEC09: Sessão com expiração, rotação de token e proteção contra sequestro.
- LGPD-TEC10: MFA para perfis administrativos.

## Backup e monitoramento
- LGPD-TEC11: Backup criptografado, restore testado e trilha de sucesso/erro.
- LGPD-TEC12: Monitoramento de anomalias, alertas de exfiltração e auditoria de terceiros.

## Exclusão segura e provedores externos
- LGPD-TEC13: Exclusão lógica + física conforme política de retenção.
- LGPD-TEC14: Integração com terceiros só com DPA, SCC/garantias de transferência internacional quando aplicável e evidência de conformidade.

---

# 8. Tabela Estruturada Consolidada

| ID | Categoria | Requisito | Descrição | Prioridade | Base legal | Artigo LGPD relacionado | Critério de aceitação |
|---|---|---|---|---|---|---|---|
| LGPD-RF01 | Coleta | Coleta mínima | Somente campos necessários por finalidade | Alta | Contrato/consentimento | Art. 6, III; Art. 7 | Inventário de campos aprovado |
| LGPD-RF03 | Consentimento | Consentimento granular | Opt-ins separados por finalidade | Alta | Consentimento | Art. 8 | Prova versionada de aceite |
| LGPD-RF05 | Auditoria | Registro de consentimento | Trilhas completas por titular | Alta | Consentimento | Art. 8, §2; Art. 37 | Histórico reconstruível |
| LGPD-RF06 | Direitos | Revogação | Revogar de modo simples | Alta | Consentimento | Art. 8, §5; Art. 18 | Revogação efetiva e auditável |
| LGPD-RF07 | Terceiros | Compartilhamento controlado | Catálogo e DPA de operadores | Alta | Contrato/LI/obrigação | Art. 33; Art. 39 | Inventário e contratos vigentes |
| LGPD-RF08 | Retenção | Temporalidade e descarte | Exclusão/anonimização automática | Alta | Obrigação legal/defesa | Art. 15; Art. 16 | Relatório de descarte periódico |
| LGPD-RF09 | Titular | DSAR completo | Atender direitos do Art. 18 | Alta | Direito do titular | Art. 18; Art. 19 | SLA e protocolo cumpridos |
| LGPD-RF10 | Segurança | Proteção técnica/administrativa | Controles de segurança fim a fim | Alta | Obrigação legal | Art. 46 | Testes e evidências aprovados |
| LGPD-RF12 | Incidentes | Notificação de incidente | Fluxo ANPD + titulares | Alta | Obrigação legal | Art. 48 | Playbook testado |
| LGPD-RF14 | Cookies | Gestão de cookies | Bloqueio prévio de não essenciais | Alta | Consentimento | Art. 7, I; Art. 8 | Sem disparo antes do opt-in |
| LGPD-RF15 | Marketing | E-mail marketing conforme | Opt-in e opt-out efetivos | Média | Consentimento/LI | Art. 7; Art. 18 | Descadastro em até 48h |
| LGPD-RF16 | Ads | Anúncios personalizados | Só com consentimento explícito | Média | Consentimento | Art. 7, I | Sem consentimento, só contexto |
| LGPD-RNF01 | Segurança técnica | Criptografia e chaves | Trânsito/repouso com rotação | Alta | Obrigação legal | Art. 46 | Compliance técnico validado |
| LGPD-RNF02 | Governança | Logs imutáveis | Auditoria completa de eventos | Alta | Prestação de contas | Art. 37; Art. 50 | Retenção e integridade comprovadas |
| LGPD-RNF03 | Continuidade | Backup e restauração | Resiliência operacional | Média | Segurança/prevenção | Art. 46 | Restore semestral aprovado |
| LGPD-DOC01 | Transparência | Documentos obrigatórios | Termo, política, aviso, cookies | Alta | Transparência | Art. 9 | Disponíveis em 1 clique |
| LGPD-TEC07 | Implementação | Consentimento versionado | Hash de versão + timestamp | Alta | Consentimento | Art. 8, §2 | Evidência íntegra por aceite |
| LGPD-TEC14 | Implementação | Integrações externas seguras | DPA e salvaguardas de transferência | Alta | Contrato/obrigação | Art. 33; Art. 46 | Due diligence e contrato aprovados |

---

## Observação técnica de aderência ao projeto analisado
Para o cenário de [ idea.md ](.SPECS/idea.md), os maiores riscos LGPD estão em: integrações com sistema externo de inscrição, uso de analytics/cookies e comunicações de marketing. A priorização deve começar por consentimento granular, inventário de terceiros, retenção automatizada e trilha de auditoria de direitos do titular.