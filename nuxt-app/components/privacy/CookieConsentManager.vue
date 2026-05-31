<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { storeToRefs } from "pinia";
import { useConsentStore } from "../../stores/consent";

const consentStore = useConsentStore();
const { status } = storeToRefs(consentStore);

const isOpen = ref(false);
const panelRef = ref<HTMLElement | null>(null);
const analyticsRef = ref<HTMLInputElement | null>(null);
const floatingButtonRef = ref<HTMLButtonElement | null>(null);
let previousFocus: HTMLElement | null = null;

const draft = reactive({
  analytics_optional: false,
  marketing_optional: false
});

const syncDraftWithStore = () => {
  draft.analytics_optional = consentStore.categories.analytics_optional;
  draft.marketing_optional = consentStore.categories.marketing_optional;
};

const closePanel = async () => {
  isOpen.value = false;
  await nextTick();

  if (previousFocus) {
    previousFocus.focus();
    previousFocus = null;
    return;
  }

  floatingButtonRef.value?.focus();
};

const openPanel = async () => {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  syncDraftWithStore();
  isOpen.value = true;
  await nextTick();
  analyticsRef.value?.focus();
};

const savePreferences = async () => {
  consentStore.setCategory("analytics_optional", draft.analytics_optional);
  consentStore.setCategory("marketing_optional", draft.marketing_optional);
  consentStore.savePreferences();
  await closePanel();
};

const acceptOptional = async () => {
  consentStore.grantOptional();
  syncDraftWithStore();
  await closePanel();
};

const revokeOptional = async () => {
  consentStore.revokeOptional();
  syncDraftWithStore();
  await closePanel();
};

const onEscKey = (event: KeyboardEvent) => {
  if (event.key === "Escape" && isOpen.value) {
    event.preventDefault();
    closePanel();
  }
};

onMounted(() => {
  syncDraftWithStore();
  window.addEventListener("keydown", onEscKey);

  if (status.value === "pending") {
    openPanel();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onEscKey);
});
</script>

<template>
  <div class="cookie-consent" data-consent-manager>
    <button
      ref="floatingButtonRef"
      type="button"
      class="cookie-consent-fab"
      data-consent-fab
      aria-label="Abrir preferencias de cookies e privacidade"
      aria-haspopup="dialog"
      :aria-expanded="String(isOpen)"
      aria-controls="cookie-consent-panel"
      @click="openPanel"
    >
      Privacidade
    </button>

    <div
      v-if="isOpen"
      class="cookie-consent-overlay"
      data-consent-overlay
      @click.self="closePanel"
    >
      <section
        id="cookie-consent-panel"
        ref="panelRef"
        class="cookie-consent-panel"
        data-consent-modal
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-consent-title"
        aria-describedby="cookie-consent-description"
      >
        <header class="cookie-consent-header">
          <h2 id="cookie-consent-title">Preferencias de privacidade</h2>
          <button type="button" class="cookie-consent-close" aria-label="Fechar painel" @click="closePanel">X</button>
        </header>

        <p id="cookie-consent-description" class="cookie-consent-description">
          Ajuste suas preferencias a qualquer momento. Cookies opcionais permanecem desativados por padrao.
        </p>

        <form class="cookie-consent-form" data-consent-form @submit.prevent="savePreferences">
          <fieldset class="cookie-consent-fieldset">
            <legend>Categorias de cookies</legend>

            <label class="cookie-consent-option" data-consent-category="essential">
              <input type="checkbox" checked disabled aria-describedby="cookie-essential-help" />
              <span>
                <strong>Essenciais</strong>
                <small id="cookie-essential-help">Sempre ativos para funcionamento basico e seguranca.</small>
              </span>
            </label>

            <label class="cookie-consent-option" data-consent-category="analytics_optional">
              <input
                ref="analyticsRef"
                v-model="draft.analytics_optional"
                type="checkbox"
                name="analytics_optional"
              />
              <span>
                <strong>Analytics</strong>
                <small>Mede uso agregado para melhorar experiencia e estabilidade.</small>
              </span>
            </label>

            <label class="cookie-consent-option" data-consent-category="marketing_optional">
              <input
                v-model="draft.marketing_optional"
                type="checkbox"
                name="marketing_optional"
              />
              <span>
                <strong>Marketing e rastreamento</strong>
                <small>Permite scripts de campanhas e medicao de conversao.</small>
              </span>
            </label>
          </fieldset>

          <div class="cookie-consent-actions">
            <button type="submit" class="cookie-consent-save" data-consent-save>
              Salvar preferencias
            </button>
            <button type="button" class="cookie-consent-accept" data-consent-accept-all @click="acceptOptional">
              Aceitar opcionais
            </button>
            <button type="button" class="cookie-consent-revoke" data-consent-revoke @click="revokeOptional">
              Revogar opcionais
            </button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<style scoped>
.cookie-consent-fab {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 50;
  border: 0;
  border-radius: 999px;
  padding: 0.7rem 1rem;
  background: #0d6a64;
  color: #fff;
  font-weight: 700;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.cookie-consent-fab:focus-visible,
.cookie-consent-close:focus-visible,
.cookie-consent-actions button:focus-visible,
.cookie-consent-option input:focus-visible {
  outline: 3px solid #114f85;
  outline-offset: 2px;
}

.cookie-consent-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: end center;
  padding: 1rem;
  background: rgba(8, 20, 24, 0.55);
}

.cookie-consent-panel {
  width: min(720px, 100%);
  max-height: 88vh;
  overflow: auto;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  background: #fff;
  color: #111;
  padding: 1rem;
}

.cookie-consent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.cookie-consent-close {
  border: 0;
  border-radius: 8px;
  width: 2rem;
  height: 2rem;
  background: #ebf2f1;
  color: #18423f;
  font-weight: 700;
}

.cookie-consent-description {
  margin: 0.5rem 0 0.9rem;
  color: #2f3f3d;
}

.cookie-consent-fieldset {
  margin: 0;
  border: 1px solid rgba(0, 0, 0, 0.14);
  border-radius: 12px;
  padding: 0.7rem;
}

.cookie-consent-option {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.55rem 0;
}

.cookie-consent-option + .cookie-consent-option {
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.cookie-consent-option small {
  display: block;
  color: #44514f;
}

.cookie-consent-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.9rem;
}

.cookie-consent-actions button {
  border: 0;
  border-radius: 10px;
  padding: 0.55rem 0.85rem;
  font-weight: 700;
}

.cookie-consent-save {
  background: #0d6a64;
  color: #fff;
}

.cookie-consent-accept {
  background: #e3f3ee;
  color: #08443f;
}

.cookie-consent-revoke {
  background: #f8ebe7;
  color: #74321b;
}

@media (max-width: 640px) {
  .cookie-consent-overlay {
    place-items: end stretch;
    padding: 0;
  }

  .cookie-consent-panel {
    border-radius: 14px 14px 0 0;
    max-height: 92vh;
  }

  .cookie-consent-fab {
    right: 0.75rem;
    bottom: 0.75rem;
  }
}
</style>