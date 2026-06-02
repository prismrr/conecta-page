Feature: API functional smoke and regression for real endpoints

Background:
  * def randomUuid = java.util.UUID.randomUUID() + ''
  * def randomToken = randomUuid.substring(0, 8)

@smoke @core
Scenario: Health endpoint should return ok
  Given url baseUrl
  And path '/healthz'
  When method get
  Then status 200
  And match response == { ok: true }

@smoke @contract @registrations
Scenario: Registration endpoint should return approved payload for stable id
  Given url baseUrl
  And path '/api/registrations/PRISM-2026-001'
  When method get
  Then status 200
  And match response ==
    """
    {
      registrationId: 'PRISM-2026-001',
      status: '#regex ^(APPROVED|UNDER_REVIEW|REJECTED)$',
      updatedAt: '#string',
      detail: '#string'
    }
    """

@regression @registrations
Scenario: Registration endpoint should return not_found for unknown id
  Given url baseUrl
  And path '/api/registrations/PRISM-2026-404'
  When method get
  Then status 404
  And match response == { ok: false, error: 'not_found' }

@smoke @telemetry
Scenario: Telemetry endpoint should accept valid event
  Given url baseUrl
  And path '/telemetry/events'
  And header Content-Type = 'application/json'
  And request
    """
    {
      event: 'karate_api_test_event',
      timestamp: '2026-06-02T10:00:00Z',
      page: 'integration',
      path: '/api',
      release_id: 'karate-test',
      environment: 'test',
      source_channel: 'integration',
      session_id: 'karate-session',
      data: { outcome: 'ok' }
    }
    """
  When method post
  Then status 202
  And match response == { ok: true, forwardStatus: '#string' }

@security @telemetry
Scenario: Telemetry endpoint should reject invalid payload
  Given url baseUrl
  And path '/telemetry/events'
  And header Content-Type = 'application/json'
  And request
    """
    {
      event: 'invalid_telemetry',
      timestamp: 'not-a-date',
      page: 'integration',
      path: '/api',
      release_id: 'karate-test',
      environment: 'test',
      source_channel: 'integration',
      session_id: 'karate-session',
      data: 'invalid'
    }
    """
  When method post
  Then status 400
  And match response contains { ok: false, error: '#string' }

@regression @inscricoes
Scenario: Inscricoes endpoint should return not_found for unknown id
  Given url baseUrl
  And path '/api/inscricoes/PRISM-2026-404'
  When method get
  Then status 404
  And match response == { ok: false, error: 'not_found' }

@regression @inscricoes
Scenario: Ingestion batch endpoint should return valid structure or batch_not_found
  Given url baseUrl
  And path '/api/inscricoes/lotes/ING-TEST-20260531-0001'
  When method get
  Then match [200, 404] contains responseStatus
  * if (responseStatus == 200) karate.match(response, { loteImportacao: '#string', statusLote: '#string', totalLinhas: '#number' })
  * if (responseStatus == 404) karate.match(response, { ok: false, error: 'batch_not_found' })

@compliance @regression
Scenario: Consent record create and list should work
  Given url baseUrl
  And path '/compliance/consent-records'
  And header Content-Type = 'application/json'
  And request
    """
    {
      version: 'v2',
      status: 'granted',
      categories: {
        essential: true,
        analytics_optional: true,
        marketing_optional: false
      },
      updatedAt: '2026-06-02T12:00:00Z',
      source: 'karate'
    }
    """
  When method post
  Then status 201
  And match response == { ok: true }

  Given url baseUrl
  And path '/compliance/consent-records'
  And param limit = 20
  When method get
  Then status 200
  And match response == { ok: true, records: '#[]' }

@compliance @regression
Scenario: DSAR list endpoint should return array
  Given url baseUrl
  And path '/compliance/dsar-requests'
  And param limit = 20
  When method get
  Then status 200
  And match response == { ok: true, requests: '#[]' }

@compliance @regression
Scenario: Integration event should update integration summary
  Given url baseUrl
  And path '/compliance/integration-events'
  And header Content-Type = 'application/json'
  And request
    """
    {
      outcome: 'ok',
      signal: 'available',
      detail: 'karate-run',
      sourcePage: 'inscricoes'
    }
    """
  When method post
  Then status 201
  And match response == { ok: true }

  Given url baseUrl
  And path '/compliance/integration-summary'
  When method get
  Then status 200
  And match response == { ok: true, summary: '#object' }

@compliance @regression
Scenario: Content audit create and list should work with unique event id
  * def eventId = 'AUD-KARATE-' + randomToken
  Given url baseUrl
  And path '/compliance/content-audit-events'
  And header Content-Type = 'application/json'
  And request
    """
    {
      eventId: '#(eventId)',
      changedAt: '2026-06-02T12:00:00Z',
      contentDomain: 'privacy',
      contentTitle: 'Politica de Privacidade',
      version: 'v2026.06',
      author: 'qa.engineer',
      changeSummary: 'Karate content audit validation',
      changeType: 'publish'
    }
    """
  When method post
  Then status 201
  And match response == { ok: true }

  Given url baseUrl
  And path '/compliance/content-audit-events'
  And param limit = 50
  When method get
  Then status 200
  And match response == { ok: true, events: '#[]' }

@observability @regression
Scenario: Observability health endpoint should return healthy structure
  Given url baseUrl
  And path '/observability/health'
  When method get
  Then status 200
  And match response == { ok: true, health: '#object' }

@observability @regression
Scenario: Observability summary endpoint should return summary structure
  Given url baseUrl
  And path '/observability/summary'
  And param windowMinutes = 60
  When method get
  Then status 200
  And match response == { ok: true, summary: '#object' }

@observability @regression
Scenario: Observability alerts endpoint should return array
  Given url baseUrl
  And path '/observability/alerts'
  And param limit = 20
  When method get
  Then status 200
  And match response == { ok: true, alerts: '#[]' }
