<script setup lang="ts">
import { reactive, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useDsarStore } from "../../stores/dsar";

const dsarStore = useDsarStore();
const { resultMessage } = storeToRefs(dsarStore);

const form = reactive({
  requestType: "",
  contactEmail: "",
  details: "",
  acknowledgement: false
});

onMounted(() => {
  dsarStore.hydrate();
});

const onSubmit = () => {
  if (!form.requestType || !form.contactEmail || !form.acknowledgement) {
    resultMessage.value = "Informe tipo de solicitacao e email para gerar o protocolo.";
    return;
  }

  dsarStore.submit({
    requestType: form.requestType,
    details: form.details
  });

  form.requestType = "";
  form.contactEmail = "";
  form.details = "";
  form.acknowledgement = false;
};
</script>

<template>
  <section class="card dsar-shell">
    <div class="section-heading">
      <h2>Canal de direitos do titular</h2>
      <p>
        Use este formulario para solicitar acesso, correcao, exclusao,
        exportacao ou revogacao de consentimento.
      </p>
    </div>

    <form class="dsar-form" data-dsar-form novalidate @submit.prevent="onSubmit">
      <label>
        Tipo da solicitacao
        <select v-model="form.requestType" name="requestType" required>
          <option value="">Selecione</option>
          <option value="acesso">Acesso a dados</option>
          <option value="correcao">Correcao de dados</option>
          <option value="exclusao">Exclusao de dados</option>
          <option value="exportacao">Exportacao de dados</option>
          <option value="revogacao_consentimento">Revogacao de consentimento</option>
        </select>
      </label>

      <label>
        Email para retorno
        <input v-model="form.contactEmail" name="contactEmail" type="email" placeholder="voce@instituicao.br" required />
      </label>

      <label>
        Detalhes da solicitacao (opcional)
        <textarea v-model="form.details" name="details" rows="4" placeholder="Inclua contexto para agilizar o atendimento."></textarea>
      </label>

      <label class="dsar-checkbox">
        <input v-model="form.acknowledgement" name="acknowledgement" type="checkbox" required />
        <span>Confirmo que as informacoes enviadas sao verdadeiras e que o contato informado esta correto.</span>
      </label>

      <button class="submit-btn" type="submit">Gerar protocolo</button>
    </form>

    <div class="dsar-result" data-dsar-result role="status">
      {{ resultMessage }}
    </div>
  </section>
</template>

<style scoped>
.dsar-form {
  display: grid;
  gap: 0.6rem;
}

.dsar-form select,
.dsar-form input,
.dsar-form textarea {
  width: 100%;
  margin-top: 0.25rem;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 0.45rem 0.6rem;
}

.dsar-checkbox {
  display: flex;
  gap: 0.45rem;
  align-items: flex-start;
}

.submit-btn {
  justify-self: start;
  border: 0;
  border-radius: 999px;
  background: #0f5f5b;
  color: #fff;
  padding: 0.5rem 1rem;
  font-weight: 700;
  cursor: pointer;
}
</style>
