<script setup lang="ts">
import { storeToRefs } from "pinia";
import AuditTrailGrid from "~/components/legal/AuditTrailGrid.vue";
import DsarRequestForm from "~/components/legal/DsarRequestForm.vue";
import LegalChangelogGrid from "~/components/legal/LegalChangelogGrid.vue";

const legalStore = useLegalStore();
const { currentPrivacyVersion, privacyChangelog, sortedAuditEvents } = storeToRefs(legalStore);

const formatDateLabel = (dateIso?: string) => legalStore.formatDateLabel(dateIso);
</script>

<template>
  <section class="grid policy-page">
    <article class="card page-head">
      <span class="badge">LGPD by design</span>
      <h1>Politica de Privacidade (versionada)</h1>
      <p class="page-version-note" data-policy-current-meta>
        Versao vigente: {{ currentPrivacyVersion?.versionLabel || "N/A" }} · em vigor desde
        {{ formatDateLabel(currentPrivacyVersion?.effectiveFrom) }}
      </p>
    </article>

    <article class="card" data-policy-current>
      <h2>Politica vigente</h2>
      <p>
        {{ currentPrivacyVersion?.summary || "Documento indisponivel no momento." }}
      </p>

      <ul v-if="currentPrivacyVersion?.highlights?.length">
        <li v-for="highlight in currentPrivacyVersion.highlights" :key="highlight">{{ highlight }}</li>
      </ul>
    </article>

    <article class="card">
      <h2>Direitos do titular</h2>
      <ul>
        <li>Acesso e correcao de dados</li>
        <li>Revogacao de consentimento</li>
        <li>Solicitacao de exclusao quando cabivel</li>
        <li>Exportacao de informacoes</li>
      </ul>
      <p>
        As preferencias por categoria podem ser atualizadas a qualquer momento
        pelo atalho "Preferencias de consentimento" exibido no portal.
      </p>
    </article>

    <article class="card">
      <div class="section-heading">
        <h2>Changelog da politica</h2>
        <p>
          Historico de alteracoes publicadas para transparencia e rastreabilidade
          do documento.
        </p>
      </div>
      <LegalChangelogGrid :versions="privacyChangelog" kind="policy" />
    </article>

    <article class="card">
      <h2>Termos de Uso versionados</h2>
      <p>
        Consulte o documento completo em sua versao vigente com data de
        vigencia e historico de publicacao.
      </p>
      <NuxtLink class="action-link" to="/termos-uso">Ver Termos de Uso</NuxtLink>
    </article>

    <DsarRequestForm />

    <article class="card">
      <div class="section-heading">
        <h2>Trilha de auditoria de conteudo critico</h2>
        <p>
          Registro append-only das alteracoes relevantes publicadas no portal,
          com autor, versao e data de efetivacao.
        </p>
      </div>
      <AuditTrailGrid :events="sortedAuditEvents" />
    </article>

    <article class="card">
      <h2>Cookies por categoria</h2>
      <ul>
        <li>Essenciais: necessarios para funcionamento e seguranca basica do portal.</li>
        <li>Analytics opcional: habilitado somente com opt-in explicito.</li>
        <li>Comunicacao opcional: habilitado somente com opt-in explicito.</li>
      </ul>
      <p>
        Ao revogar opcionais, os cookies correspondentes sao removidos do
        navegador e novas preferencias passam a valer imediatamente.
      </p>
    </article>

    <article class="card">
      <h2>Contato DPO</h2>
      <p>Email ficticio para ambiente de desenvolvimento: dpo@conecta-prismrr.example</p>
    </article>
  </section>
</template>

<style scoped>
.action-link {
  display: inline-flex;
  margin-top: 0.5rem;
  font-weight: 700;
}

.legal-changelog-grid,
.audit-grid {
  display: grid;
  gap: 0.7rem;
}

.legal-changelog-card,
.audit-card {
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  padding: 0.75rem;
  background: #fff;
}
</style>
