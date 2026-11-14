import { pathToFileURL } from "node:url";

export async function checkDeployment(target, { apiOnly = false, bypass, fetchImpl = fetch } = {}) {
  const base = new URL(target);
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new Error("Provide an HTTP(S) URL without credentials, query or fragment.");
  }
  const headers = bypass ? { "x-vercel-protection-bypass": bypass } : {};
  async function get(path, json = true) {
    const response = await fetchImpl(`${base.href.replace(/\/$/, "")}${path}`, {
      headers, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(90000),
    });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    if (json && !response.headers.get("content-type")?.includes("application/json")) {
      throw new Error(`${path}: expected JSON from the API, received another content type.`);
    }
    return json ? response.json() : response.text();
  }
  if (!apiOnly) {
    const html = await get("/", false);
    if (!/<html[\s>]/i.test(html)) throw new Error("The home page did not return HTML.");
  }
  const prefix = apiOnly ? "" : "/api";
  const health = await get(`${prefix}/health`);
  if (health.status !== "ok" || health.db !== "up") throw new Error("API/database health check failed.");
  const products = await get(`${prefix}/products?page=1&limit=1`);
  if (!Array.isArray(products.data)) throw new Error("Product API returned an unexpected response shape.");
  console.log(`Smoke check passed: ${base.origin} (health, database, products${apiOnly ? "" : ", web and API proxy"}).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await checkDeployment(process.argv[2], { apiOnly: process.argv.includes("--api-only"), bypass: process.env.VERCEL_AUTOMATION_BYPASS_SECRET });
  } catch (error) {
    console.error(`Smoke check failed: ${error.message}`);
    process.exitCode = 1;
  }
}
