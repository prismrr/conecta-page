Feature: API authentication reusable flow

Scenario: Obtain bearer token
  Given url baseUrl
  And path authPath
  And request
    """
    {
      "username": "#(username)",
      "password": "#(password)"
    }
    """
  When method post
  Then status 200
  And match response ==
    """
    {
      access_token: '#string',
      token_type: '#string',
      expires_in: '#number'
    }
    """
  * def token = response.access_token
