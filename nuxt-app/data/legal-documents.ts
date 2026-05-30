export type LegalVersion = {
  id: string;
  versionLabel: string;
  status: "published" | "draft";
  effectiveFrom: string;
  publishedAt: string;
  summary: string;
  highlights?: string[];
  changes: string[];
};

export type VersionedDocument = {
  currentVersionId: string;
  versions: LegalVersion[];
};

export const legalDocuments = {
  privacyPolicy: {
    currentVersionId: "privacy-v2026.1",
    versions: [
      {
        id: "privacy-v2026.1",
        versionLabel: "v2026.1",
        status: "published",
        effectiveFrom: "2026-05-23",
        publishedAt: "2026-05-23",
        summary:
          "Versao vigente da politica de privacidade do portal Conecta PrismRR, com detalhamento de finalidades, direitos do titular e controles de cookies por categoria.",
        highlights: [
          "Tratamento minimo para orientacao de inscricoes, comunicacao de resultados e operacao do portal.",
          "Preferencias de consentimento por categoria com revogacao a qualquer momento.",
          "Cookies opcionais ativados somente por opt-in explicito do titular."
        ],
        changes: [
          "Formalizacao da vigencia da politica em versao publicada.",
          "Inclusao explicita da gestao de cookies por categoria e efeito imediato da revogacao.",
          "Ajuste de linguagem para reforcar transparencia sobre direitos do titular."
        ]
      },
      {
        id: "privacy-v2026.0",
        versionLabel: "v2026.0",
        status: "published",
        effectiveFrom: "2026-05-12",
        publishedAt: "2026-05-12",
        summary: "Versao inicial do resumo de privacidade do MVP.",
        changes: [
          "Primeira publicacao do resumo LGPD do portal.",
          "Definicao inicial de direitos do titular e contato DPO."
        ]
      }
    ]
  } as VersionedDocument,
  termsOfUse: {
    currentVersionId: "terms-v2026.1",
    versions: [
      {
        id: "terms-v2026.1",
        versionLabel: "v2026.1",
        status: "published",
        effectiveFrom: "2026-05-23",
        publishedAt: "2026-05-23",
        summary:
          "Versao vigente dos Termos de Uso do portal Conecta PrismRR com regras de uso, responsabilidade informacional e condutas esperadas.",
        highlights: [
          "Uso do portal destinado a informacoes oficiais do ciclo PRISM Conecta.",
          "Conteudos de inscricao e agenda devem ser interpretados conforme versoes publicadas.",
          "Proibido uso indevido de automacao para coleta abusiva de conteudo e servicos."
        ],
        changes: [
          "Publicacao inicial versionada dos Termos de Uso com data de vigencia.",
          "Inclusao de diretrizes de uso aceitavel e limites de responsabilidade.",
          "Padronizacao de referencia a documentos legais vigentes."
        ]
      }
    ]
  } as VersionedDocument
};
