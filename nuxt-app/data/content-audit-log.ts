export type ContentAuditEvent = {
  eventId: string;
  changedAt: string;
  contentDomain: string;
  contentTitle: string;
  version: string;
  author: string;
  changeSummary: string;
  changeType: string;
};

export const contentAuditLog = {
  events: [
    {
      eventId: "AUD-20260512-001",
      changedAt: "2026-05-12T14:20:00Z",
      contentDomain: "privacy_policy",
      contentTitle: "Politica de Privacidade",
      version: "v2026.0",
      author: "Time de Compliance",
      changeSummary: "Publicacao inicial do resumo de privacidade do portal.",
      changeType: "publish"
    },
    {
      eventId: "AUD-20260520-001",
      changedAt: "2026-05-20T10:30:00Z",
      contentDomain: "registration_guidance",
      contentTitle: "Orientacoes de Inscricao",
      version: "v2026.2",
      author: "Comite de Programa PRISM",
      changeSummary: "Consolidacao de criterios, vigencia e fluxo oficial para submissao externa.",
      changeType: "publish"
    },
    {
      eventId: "AUD-20260523-001",
      changedAt: "2026-05-23T09:10:00Z",
      contentDomain: "terms_of_use",
      contentTitle: "Termos de Uso",
      version: "v2026.1",
      author: "Time Juridico e Compliance",
      changeSummary: "Publicacao versionada com regras de uso aceitavel e limites de responsabilidade.",
      changeType: "publish"
    },
    {
      eventId: "AUD-20260523-002",
      changedAt: "2026-05-23T11:05:00Z",
      contentDomain: "privacy_policy",
      contentTitle: "Politica de Privacidade",
      version: "v2026.1",
      author: "Time de Compliance",
      changeSummary: "Atualizacao de vigencia, changelog e transparencia de cookies por categoria.",
      changeType: "revision"
    },
    {
      eventId: "AUD-20260523-003",
      changedAt: "2026-05-23T12:40:00Z",
      contentDomain: "faq",
      contentTitle: "FAQ Curada",
      version: "v2026.1",
      author: "Equipe Editorial Conecta",
      changeSummary: "Publicacao de respostas oficiais consolidadas a partir das paginas criticas do portal.",
      changeType: "publish"
    }
  ] as ContentAuditEvent[]
};
