# API do Projeto Conecta PrismRR

Este documento descreve a API HTTP exposta pelo servidor local do projeto.

Implementacao principal:
- [scripts/dev_server.py](../scripts/dev_server.py)

Contrato OpenAPI da integracao externa de inscricoes:
- [contracts/openapi/registration-result.v1.0.0.openapi.json](../contracts/openapi/registration-result.v1.0.0.openapi.json)

## Visao geral
- Tipo: REST HTTP/JSON
- Servidor local padrao: http://127.0.0.1:8080
- Content-Type de entrada esperado: application/json (quando houver corpo)
- Limite de corpo JSON: 1 MB

## Convencoes de resposta
- Endpoints de negocio retornam JSON com campo ok em cenarios de sucesso.
- Erros de validacao de corpo normalmente retornam 400 com payload no formato:
  - ok: false
  - error: codigo_de_erro

Codigos de erro comuns de parsing JSON:
- invalid_content_length
- empty_body
- body_too_large
- invalid_json
- payload_must_be_object

## CORS e preflight
O metodo OPTIONS responde com 204 para:
- /telemetry/events
- rotas iniciadas por /compliance/
- rotas iniciadas por /observability/

Headers CORS retornados nesses casos:
- Access-Control-Allow-Origin: *
- Access-Control-Allow-Methods: GET, POST, OPTIONS
- Access-Control-Allow-Headers: Content-Type

## Endpoints

### Health

#### GET /healthz
Verifica disponibilidade basica do servidor.

Resposta 200:
{
  "ok": true
}

---

### Telemetria

#### POST /telemetry/events
Recebe evento de telemetria, grava em log local, persiste em SQLite e tenta forwarding opcional.

Corpo esperado (exemplo):
{
  "event": "page_view",
  "timestamp": "2026-05-23T00:00:00Z",
  "page": "home",
  "path": "/index.html",
  "release_id": "local-stack",
  "environment": "development",
  "source_channel": "web",
  "session_id": "local-test",
  "data": {
    "outcome": "ok"
  }
}

Resposta 202:
{
  "ok": true,
  "forwardStatus": "not_configured"
}

Possiveis valores de forwardStatus:
- not_configured
- forwarded
- forward_config_error
- forward_failed
- forward_failed_http_<status>

---

### Compliance

#### POST /compliance/consent-records
Persiste registro de consentimento granular.

Campos relevantes de entrada:
- version: string obrigatoria
- status: granted ou revoked
- categories: objeto obrigatorio
  - essential: boolean
  - analytics_optional: boolean
  - communication_optional: boolean
- updatedAt: string opcional
- source: string opcional

Resposta sucesso 201:
{
  "ok": true
}

Erros 400:
- categories_must_be_object
- missing_version
- invalid_status

#### GET /compliance/consent-records?limit=20
Lista registros de consentimento (ordem decrescente).

Query param:
- limit: inteiro, minimo 1, maximo 200, padrao 20

Resposta 200 (exemplo):
{
  "ok": true,
  "records": [
    {
      "recordedAt": "2026-05-23T12:00:00+00:00",
      "version": "v2",
      "updatedAt": "2026-05-23T12:00:00Z",
      "source": "consent-modal",
      "status": "granted",
      "categories": {
        "essential": true,
        "analytics_optional": true,
        "communication_optional": false
      }
    }
  ]
}

#### POST /compliance/integration-events
Persiste evento operacional da integracao externa.

Campos de entrada:
- outcome: string obrigatoria
- signal: obrigatorio, um de:
  - available
  - degraded
  - unavailable
  - unknown
- detail: string opcional
- sourcePage: string opcional

Resposta sucesso 201:
{
  "ok": true
}

Erros 400:
- missing_outcome
- invalid_signal

#### GET /compliance/integration-summary
Retorna agregados operacionais da integracao externa.

Resposta 200 (exemplo):
{
  "ok": true,
  "summary": {
    "totalChecks": 10,
    "availableChecks": 7,
    "degradedChecks": 2,
    "providerFailures": 3,
    "lastEvent": {
      "recordedAt": "2026-05-23T12:30:00+00:00",
      "outcome": "http_503",
      "signal": "unavailable",
      "detail": "Provider timeout"
    }
  }
}

#### POST /compliance/content-audit-events
Persiste evento append-only de auditoria de conteudo critico.

Campos obrigatorios:
- eventId
- changedAt
- contentDomain
- contentTitle
- version
- author
- changeSummary
- changeType

Resposta sucesso 201:
{
  "ok": true
}

Erros:
- 400 com error: missing_<campo>
- 409 com error: event_id_already_exists

#### GET /compliance/content-audit-events?limit=50
Lista eventos de auditoria de conteudo.

Query param:
- limit: inteiro, minimo 1, maximo 500, padrao 50

Resposta 200:
{
  "ok": true,
  "events": [
    {
      "eventId": "AUD-20260523-001",
      "changedAt": "2026-05-23T09:10:00Z",
      "contentDomain": "terms_of_use",
      "contentTitle": "Termos de Uso",
      "version": "v2026.1",
      "author": "Time Juridico e Compliance",
      "changeSummary": "Publicacao versionada",
      "changeType": "publish"
    }
  ]
}

---

### Observabilidade

#### GET /observability/summary?windowMinutes=60
Retorna consolidado de telemetria na janela informada.

Query param:
- windowMinutes: inteiro, minimo 1, maximo 1440, padrao 60

Resposta 200 (estrutura):
{
  "ok": true,
  "summary": {
    "windowMinutes": 60,
    "totalEvents": 100,
    "byRelease": [
      {
        "releaseId": "mvp-0.2.0",
        "totalEvents": 80,
        "syncFailures": 3,
        "lastSeenAt": "2026-05-23T13:00:00+00:00"
      }
    ],
    "byEvent": [
      {
        "event": "page_view",
        "total": 60
      }
    ],
    "forwarding": {
      "forwarded": 20,
      "notConfigured": 80,
      "failed": 0
    }
  }
}

#### GET /observability/alerts?limit=20
Lista alertas operacionais gerados automaticamente.

Query param:
- limit: inteiro, minimo 1, maximo 200, padrao 20

Resposta 200:
{
  "ok": true,
  "alerts": [
    {
      "createdAt": "2026-05-23T14:00:00+00:00",
      "alertType": "external_data_sync_failed_spike",
      "severity": "high",
      "releaseId": "mvp-0.2.0",
      "message": "Falhas de sincronizacao externa acima do limiar na janela configurada.",
      "details": {
        "windowMinutes": 15,
        "failureCount": 4,
        "threshold": 3,
        "releaseId": "mvp-0.2.0"
      }
    }
  ]
}

#### GET /observability/health
Retorna estado operacional da camada de observabilidade.

Resposta 200 (estrutura):
{
  "ok": true,
  "health": {
    "status": "ok",
    "database": {
      "ok": true,
      "error": null,
      "path": ".../data/compliance.db"
    },
    "forwarding": {
      "configured": false,
      "destination": null,
      "provider": "raw",
      "authType": "none",
      "timeoutSeconds": 3
    },
    "alerts": {
      "rule": {
        "failureThreshold": 3,
        "windowMinutes": 15
      },
      "last": null,
      "countLast24h": 0
    },
    "telemetry": {
      "last": null,
      "countLast24h": 0
    }
  }
}

---

### Integracao externa de inscricoes (mock local)

#### GET /api/registrations/{registrationId}
Retorna resultado de inscricao (mock) usado para fluxo de UI e testes.

Comportamentos especiais por sufixo do registrationId:
- termina com 404: retorna 404 com error not_found
- termina com 401: retorna 401 com error unauthorized
- termina com 503: retorna 503 com error provider_unavailable
- termina com 999: retorna 200 com payload intencionalmente invalido de contrato

Sucesso 200 (contrato valido):
{
  "registrationId": "PRISM-2026-001",
  "status": "APPROVED",
  "updatedAt": "2026-05-24T10:00:00+00:00",
  "detail": "Classificado para a trilha principal"
}

Erro 400 quando ID ausente no path:
{
  "ok": false,
  "error": "missing_registration_id"
}

Contrato formal:
- [contracts/openapi/registration-result.v1.0.0.openapi.json](../contracts/openapi/registration-result.v1.0.0.openapi.json)
- [contracts/registration-result.contract.json](../contracts/registration-result.contract.json)

## Referencias de teste da API
- Integracao geral do servidor: [tests/integration/dev-server.integration.test.js](../tests/integration/dev-server.integration.test.js)
- Smoke test CLI: [scripts/smoke_test.sh](../scripts/smoke_test.sh)
- Contrato OpenAPI: [tests/contract/registration-openapi.contract.test.js](../tests/contract/registration-openapi.contract.test.js)
- Provider verification (Prism): [tests/contract/registration-provider-prism.contract.test.js](../tests/contract/registration-provider-prism.contract.test.js)
