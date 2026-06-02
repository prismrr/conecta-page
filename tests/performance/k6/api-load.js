import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 20 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 }
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500']
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8080';
const TARGET_PATH = __ENV.TARGET_PATH || '/api/inscricoes/PRISM-2026-001';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

export default function () {
  const params = {
    headers: {
      Accept: 'application/json'
    },
    tags: {
      name: 'inscricoes_lookup'
    }
  };

  if (AUTH_TOKEN) {
    params.headers.Authorization = `Bearer ${AUTH_TOKEN}`;
  }

  const response = http.get(`${BASE_URL}${TARGET_PATH}`, params);

  check(response, {
    'status is expected': (r) => r.status === 200 || r.status === 404,
    'response time under 500ms': (r) => r.timings.duration < 500
  });

  sleep(1);
}
