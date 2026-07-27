const BASE_URL = process.env.PAWAPAY_BASE_URL || "https://api.sandbox.pawapay.io";
const API_TOKEN = process.env.PAWAPAY_API_TOKEN || "";

async function main() {
  const res = await fetch(`${BASE_URL}/v2/active-conf?country=CMR`, {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
main();
