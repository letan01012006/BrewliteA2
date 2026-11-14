import assert from "node:assert/strict";
import test from "node:test";
import { sourceLoader } from "./load-source.mjs";

function config(env) {
  return sourceLoader({}, { process: { env }, URL })("next.config.ts").default;
}

test("local development keeps the default API proxy", async () => {
  assert.deepEqual(JSON.parse(JSON.stringify(await config({}).rewrites())), [
    { source: "/api/:path*", destination: "http://127.0.0.1:4000/api/:path*" },
  ]);
});

test("Vercel rewrites API calls to the configured HTTPS backend", async () => {
  const rules = await config({ VERCEL: "1", BACKEND_API_URL: "https://example.onrender.com/api/" }).rewrites();
  assert.equal(rules[0].destination, "https://example.onrender.com/api/:path*");
});

test("Vercel refuses a build without a usable public API", () => {
  assert.throws(() => config({ VERCEL: "1" }), /Set BACKEND_API_URL/);
  for (const url of ["http://example.com/api", "https://localhost/api", "https://api/api"]) {
    assert.throws(() => config({ VERCEL: "1", BACKEND_API_URL: url }), /public HTTPS/);
  }
});

test("the proxy rejects credentials, query strings and incorrect API paths", () => {
  for (const url of ["https://u:p@example.com/api", "https://example.com/api?token=x", "https://example.com/api#x", "https://example.com", "ftp://example.com/api"]) {
    assert.throws(() => config({ BACKEND_API_URL: url }), /HTTP\(S\) URL/);
  }
});
