export type ScheduleSession = {
  id: string;
  startTime: string;
  endTime: string;
  title: string;
  summary: string;
  track: string;
  period: "manha" | "tarde";
  format: string;
  room: string;
};

export type SpeakerLink = {
  label: string;
  url: string;
};

export type SpeakerProfile = {
  id: string;
  name: string;
  institution: string;
  area: string;
  bio: string;
  links: SpeakerLink[];
};

export const scheduleData = {
  sessions: [
    {
      id: "sess-101",
      startTime: "09:00",
      endTime: "09:40",
      title: "Abertura e visao de pesquisa aplicada",
      summary: "Panorama do ciclo Conecta, prioridades de extensao e alinhamento do dia.",
      track: "Governanca e Impacto",
      period: "manha",
      format: "keynote",
      room: "Palco Conecta"
    },
    {
      id: "sess-102",
      startTime: "10:00",
      endTime: "10:50",
      title: "Sistemas Embarcados Inteligentes",
      summary: "Arquiteturas de edge, sensores embarcados e estrategias de validacao aplicada.",
      track: "Engenharia de Plataformas",
      period: "manha",
      format: "painel",
      room: "Sala Horizonte"
    },
    {
      id: "sess-103",
      startTime: "11:10",
      endTime: "11:50",
      title: "Dados clinicos interoperaveis",
      summary: "Padroes de interoperabilidade e integracao segura de dados em jornadas digitais.",
      track: "Saude Digital",
      period: "manha",
      format: "talk",
      room: "Sala Horizonte"
    },
    {
      id: "sess-201",
      startTime: "14:00",
      endTime: "14:45",
      title: "Sistemas Ciber-Fisicos e testes",
      summary: "Confiabilidade, instrumentacao e testes de integracao em ambientes conectados.",
      track: "Qualidade e Confiabilidade",
      period: "tarde",
      format: "talk",
      room: "Laboratorio Vivo"
    },
    {
      id: "sess-202",
      startTime: "15:00",
      endTime: "15:45",
      title: "IA responsavel para triagem operacional",
      summary: "Uso de modelos assistivos com governanca, rastreabilidade e mitigacao de vies.",
      track: "Governanca e Impacto",
      period: "tarde",
      format: "mesa",
      room: "Palco Conecta"
    },
    {
      id: "sess-203",
      startTime: "16:00",
      endTime: "16:40",
      title: "Encerramento com roadmap colaborativo",
      summary: "Fechamento do ciclo com prioridades compartilhadas para a proxima edicao.",
      track: "Governanca e Impacto",
      period: "tarde",
      format: "closing",
      room: "Palco Conecta"
    }
  ] as ScheduleSession[],
  speakers: [
    {
      id: "speaker-ana-moura",
      name: "Dra. Ana Moura",
      institution: "Laboratorio de Sistemas Embarcados da UFRR",
      area: "Intelligent Embedded Systems",
      bio: "Pesquisa arquiteturas embarcadas para monitoramento clinico e lidera projetos de validacao em edge computing aplicada.",
      links: [
        {
          label: "Perfil institucional",
          url: "https://www.ufrr.br/"
        },
        {
          label: "Publicacoes",
          url: "https://scholar.google.com/"
        }
      ]
    },
    {
      id: "speaker-caio-lins",
      name: "Prof. Caio Lins",
      institution: "Nucleo de Sistemas Ciber-Fisicos do IFRR",
      area: "Cyber-Physical Systems",
      bio: "Atua na integracao entre automacao, sensores e observabilidade para ambientes fisicos conectados de alta criticidade.",
      links: [
        {
          label: "Perfil institucional",
          url: "https://www.ifrr.edu.br/"
        },
        {
          label: "Repositorio tecnico",
          url: "https://github.com/"
        }
      ]
    },
    {
      id: "speaker-luiza-viana",
      name: "Dra. Luiza Viana",
      institution: "Centro de Qualidade de Software Aplicado da UFAM",
      area: "Verification and Automated Testing",
      bio: "Especialista em estrategia de testes, confiabilidade de pipelines e desenho de validacao automatizada para plataformas digitais.",
      links: [
        {
          label: "Perfil institucional",
          url: "https://www.ufam.edu.br/"
        },
        {
          label: "Artigos selecionados",
          url: "https://orcid.org/"
        }
      ]
    },
    {
      id: "speaker-rafael-pires",
      name: "Prof. Rafael Pires",
      institution: "Observatorio de Sistemas de Decisao da UEA",
      area: "Decision Systems in Applied Engineering",
      bio: "Conduz iniciativas de apoio a decisao com foco em governanca de dados, impacto operacional e transferencia tecnologica.",
      links: [
        {
          label: "Perfil institucional",
          url: "https://www.uea.edu.br/"
        },
        {
          label: "LinkedIn",
          url: "https://www.linkedin.com/"
        }
      ]
    }
  ] as SpeakerProfile[]
};
