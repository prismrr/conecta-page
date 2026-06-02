import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const PROFILE = __ENV.K6_PROFILE || 'baseline';
const RESULT_LOOKUP_P95_MS = Number(__ENV.RESULT_LOOKUP_P95_MS || 2000);

const profileStages = {
  ci: [
    { duration: '20s', target: 10 },
    { duration: '40s', target: 20 },
    { duration: '20s', target: 0 }
  ],
  smoke: [
    { duration: '30s', target: 10 },
    { duration: '30s', target: 10 },
    { duration: '20s', target: 0 }
  ],
  baseline: [
    { duration: '2m', target: 20 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 }
  ],
  stress: [
    { duration: '2m', target: 50 },
    { duration: '8m', target: 200 },
    { duration: '2m', target: 0 }
  ]
};

const activeStages = profileStages[PROFILE] || profileStages.baseline;

export const options = {
  stages: activeStages,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
    http_req_duration: ['p(95)<500'],
    result_lookup_duration: [`p(95)<${RESULT_LOOKUP_P95_MS}`]
  },
  tags: {
    profile: PROFILE,
    service: 'conecta-api'
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8080';
const TARGET_PATH = __ENV.TARGET_PATH || '/api/inscricoes/PRISM-2026-001';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
const resultLookupDuration = new Trend('result_lookup_duration');

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
  resultLookupDuration.add(response.timings.duration);

  check(response, {
    'status is expected': (r) => r.status === 200 || r.status === 404,
    'response time under 500ms': (r) => r.timings.duration < 500
  });

  sleep(1);
}

export function handleSummary(data) {
  const json = JSON.stringify(data, null, 2);
  const text = [
    `k6 profile: ${PROFILE}`,
    `http_req_failed(rate): ${data.metrics.http_req_failed?.values?.rate ?? 'n/a'}`,
    `http_req_duration p(95): ${data.metrics.http_req_duration?.values?.['p(95)'] ?? 'n/a'}`,
    `result_lookup_duration p(95): ${data.metrics.result_lookup_duration?.values?.['p(95)'] ?? 'n/a'}`,
    `result_lookup_duration target_ms: ${RESULT_LOOKUP_P95_MS}`,
    `iterations: ${data.metrics.iterations?.values?.count ?? 'n/a'}`,
    `vus_max: ${data.metrics.vus_max?.values?.value ?? 'n/a'}`
  ].join('\n');

  return {
    stdout: `${text}\n`,
    'logs/k6/summary.json': json,
    'logs/k6/summary.txt': `${text}\n`
  };
}
