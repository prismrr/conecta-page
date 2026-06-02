Feature: API functional smoke for real endpoints

Scenario: Health endpoint should return ok
  Given url baseUrl
  And path '/healthz'
  When method get
  Then status 200
  And match response == { ok: true }

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

Scenario: Registration endpoint should return not_found for unknown id
  Given url baseUrl
  And path '/api/registrations/PRISM-2026-404'
  When method get
  Then status 404
  And match response == { ok: false, error: 'not_found' }

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

Scenario: Inscricoes endpoint should return not_found for unknown id
  Given url baseUrl
  And path '/api/inscricoes/PRISM-2026-404'
  When method get
  Then status 404
  And match response == { ok: false, error: 'not_found' }
