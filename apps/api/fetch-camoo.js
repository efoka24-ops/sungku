// Fetch transaction history from Camoo API
const BASE_URL = process.env.CAMOO_BASE_URL || "https://api.camoo.cm/v1/payment";
const API_KEY = process.env.CAMOO_API_KEY || "";
const API_SECRET = process.env.CAMOO_API_SECRET || "";

const headers = {
  "X-Api-Key": API_KEY,
  "X-Api-Secret": API_SECRET,
  "Content-Type": "application/json",
};

async function main() {
  // Try account info first
  console.log("=== Account ===");
  try {
    const r = await fetch(`${BASE_URL}/account`, { headers });
    console.log("Status:", r.status);
    console.log(await r.json());
  } catch (e) { console.error(e); }

  // Try common transaction listing endpoints
  for (const path of ["/transactions", "/history", "/cashout/list", "/payments", "/cashouts"]) {
    console.log(`\n=== GET ${path} ===`);
    try {
      const r = await fetch(`${BASE_URL}${path}`, { headers });
      console.log("Status:", r.status);
      const body = await r.text();
      console.log(body.slice(0, 1000));
    } catch (e) { console.error(e); }
  }
}

main();
