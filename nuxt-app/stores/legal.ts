import { defineStore } from "pinia";
import { contentAuditLog } from "../data/content-audit-log";
import { legalDocuments, type LegalVersion, type VersionedDocument } from "../data/legal-documents";

const getPublishedVersions = (documentData: VersionedDocument) =>
  documentData.versions.filter((version) => version.status === "published");

const getCurrentVersion = (documentData: VersionedDocument): LegalVersion | null => {
  const published = getPublishedVersions(documentData);
  if (!published.length) {
    return null;
  }

  return published.find((version) => version.id === documentData.currentVersionId) || published[0];
};

const formatDateLabel = (dateIso?: string) => {
  if (!dateIso) {
    return "Data nao informada";
  }

  const parts = String(dateIso).split("-");
  if (parts.length === 3) {
    const normalizedDate = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12));
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(normalizedDate);
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(dateIso));
};

export const useLegalStore = defineStore("legal", {
  state: () => ({
    privacyPolicy: legalDocuments.privacyPolicy,
    termsOfUse: legalDocuments.termsOfUse,
    auditEvents: contentAuditLog.events
  }),
  getters: {
    currentPrivacyVersion: (state) => getCurrentVersion(state.privacyPolicy),
    privacyChangelog: (state) => getPublishedVersions(state.privacyPolicy),
    currentTermsVersion: (state) => getCurrentVersion(state.termsOfUse),
    termsChangelog: (state) => getPublishedVersions(state.termsOfUse),
    sortedAuditEvents: (state) =>
      state.auditEvents
        .slice()
        .sort((left, right) => String(right.changedAt).localeCompare(String(left.changedAt)))
  },
  actions: {
    formatDateLabel(dateIso?: string) {
      return formatDateLabel(dateIso);
    }
  }
});
