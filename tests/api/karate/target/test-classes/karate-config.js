function fn() {
  var env = karate.env || 'local';

  var config = {
    env: env,
    baseUrl: karate.properties['baseUrl'] || 'http://127.0.0.1:8080',
    authPath: karate.properties['authPath'] || '/auth/token',
    username: karate.properties['username'] || 'qa.user',
    password: karate.properties['password'] || 'qa.pass',
    timeoutMs: karate.properties['timeoutMs'] || 10000
  };

  karate.configure('connectTimeout', config.timeoutMs);
  karate.configure('readTimeout', config.timeoutMs);

  return config;
}
