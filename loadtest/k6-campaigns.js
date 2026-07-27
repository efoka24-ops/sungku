import http from "k6/http";
import { check, sleep } from "k6";

// Load test for the Sungku API. Run against a STAGING target, not free prod.
//   k6 run -e BASE_URL=https://staging-api... loadtest/k6-campaigns.js
const BASE = __ENV.BASE_URL || "https://sungku-api-production.up.railway.app";

export const options = {
  scenarios: {
    ramp: {
      executor: "ramping-vus",
      startVUs: 0,
      // Ramp virtual users. Increase `target` progressively on a scalable environment.
      stages: [
        { duration: "30s", target: 50 },
        { duration: "1m", target: 200 },
        { duration: "1m", target: 500 },
        { duration: "1m", target: 1000 },
        { duration: "30s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"], // <5% errors
    http_req_duration: ["p(95)<1500"], // 95% under 1.5s
  },
};

export default function () {
  // Read-only endpoints that mirror real front-end polling.
  const health = http.get(`${BASE}/health`);
  check(health, { "health 200": (r) => r.status === 200 });

  const campaigns = http.get(`${BASE}/campaigns`);
  check(campaigns, { "campaigns 200": (r) => r.status === 200 });

  sleep(1); // pacing per virtual user
}
