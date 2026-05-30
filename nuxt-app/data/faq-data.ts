export type FaqItem = {
  id: string;
  category: string;
  question: string;
  answer: string;
};

export const faqData = {
  items: [
    {
      id: "faq-what-is-conecta",
      category: "Geral",
      question: "O que e o Conecta PrismRR?",
      answer:
        "O Conecta PrismRR e o portal oficial do ciclo PRISM Conecta 2026, criado para centralizar informacoes do evento, trilhas tecnicas, agenda, inscricoes e comunicacoes oficiais."
    },
    {
      id: "faq-who-can-participate",
      category: "Geral",
      question: "Quem pode participar do evento?",
      answer:
        "O ciclo foi pensado para estudantes de graduacao e pos-graduacao, docentes, pesquisadores e publico externo interessado em engenharia aplicada e sistemas digitais."
    },
    {
      id: "faq-how-to-register",
      category: "Inscricoes",
      question: "Como faco minha inscricao?",
      answer:
        "Consulte a versao vigente das orientacoes na pagina de inscricoes, confirme os criterios de elegibilidade e realize a submissao no sistema externo oficial usando o link publicado pela equipe organizadora."
    },
    {
      id: "faq-how-to-check-result",
      category: "Inscricoes",
      question: "Como acompanho o resultado da inscricao?",
      answer:
        "A pagina de inscricoes permite consultar o resultado oficial com o codigo da inscricao. O portal valida o retorno do sistema externo e exibe um estado controlado caso haja indisponibilidade."
    },
    {
      id: "faq-programming-filters",
      category: "Programacao",
      question: "Como encontro sessoes da minha area na agenda?",
      answer:
        "Na pagina de programacao, a agenda e ordenada por horario e pode ser filtrada por trilha e turno para facilitar a localizacao das sessoes mais relevantes para voce."
    },
    {
      id: "faq-privacy-data",
      category: "Privacidade",
      question: "Quais dados o portal pode tratar no MVP?",
      answer:
        "No MVP, o portal informa tratamento de nome, email institucional e preferencias de comunicacao quando aplicavel, sempre com foco em divulgacao do evento, orientacao de inscricoes e comunicacao de resultados."
    },
    {
      id: "faq-consent-rights",
      category: "Privacidade",
      question: "Quais direitos do titular sao informados nesta versao?",
      answer:
        "O resumo atual da politica destaca acesso e correcao de dados, revogacao de consentimento, solicitacao de exclusao quando cabivel e exportacao de informacoes."
    }
  ] as FaqItem[]
};
