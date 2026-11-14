import assert from "node:assert/strict";
import test from "node:test";
import { verifyCi } from "../../scripts/deploy/verify-ci.mjs";
import { deployRender } from "../../scripts/deploy/render.mjs";
import { checkDeployment } from "../../scripts/deploy/smoke.mjs";

const commit = "a".repeat(40);
const repository = "owner/repo";
const json = (body, status = 200) => Response.json(body, { status });
const successfulRun = {
  id: 1, run_number: 1, run_attempt: 1, head_sha: commit, head_branch: "main",
  head_repository: { full_name: repository }, event: "push", status: "completed", conclusion: "success",
};
function gate(runs, main = commit) {
  return verifyCi({ repository, commit, token: "test-token", fetchImpl: async (url) =>
    url.includes("git/ref") ? json({ object: { sha: main } }) : json({ workflow_runs: runs }),
  });
}

test("CD accepts successful CI for the same main revision", async () => {
  assert.equal(await gate([successfulRun]), true);
});
test("CD skips a superseded main revision", async () => {
  assert.equal(await gate([successfulRun], "b".repeat(40)), false);
});
test("CD refuses failed CI, PR runs and runs from another repository", async () => {
  for (const override of [{ conclusion: "failure" }, { event: "pull_request" }, { head_repository: { full_name: "other/repo" } }]) {
    await assert.rejects(() => gate([{ ...successfulRun, ...override }]), /has not passed/);
  }
});
test("an older success cannot override a newer pending or failed CI run", async () => {
  await assert.rejects(() => gate([successfulRun, { ...successfulRun, id: 2, run_number: 2, status: "in_progress", conclusion: null }]), /has not passed/);
});

function render(fetchImpl, attempts = 2) {
  return deployRender({ serviceId: "srv-example", token: "test-token", commit, fetchImpl, wait: async () => {}, attempts });
}
test("Render deploy pins the commit and waits for that deploy to become live", async () => {
  const calls = [];
  const result = await render(async (url, options) => {
    calls.push({ url, ...options });
    if (options.method === "POST") return json({ id: "dep-example" });
    return json({ status: calls.length === 2 ? "build_in_progress" : "live", commit: { id: commit } });
  });
  assert.equal(result, "dep-example");
  assert.equal(JSON.parse(calls[0].body).commitId, commit);
  assert.equal(calls[2].url, "https://api.render.com/v1/services/srv-example/deploys/dep-example");
});
test("Render build failure prevents frontend deployment", async () => {
  await assert.rejects(() => render(async (_url, options) => options.method === "POST" ? json({ id: "dep-example" }) : json({ status: "build_failed" })), /build_failed/);
});
test("Render live status with a different commit is rejected", async () => {
  await assert.rejects(() => render(async (_url, options) => options.method === "POST" ? json({ id: "dep-example" }) : json({ status: "live", commit: { id: "b".repeat(40) } })), /does not match/);
});
test("Render does not automatically retry a POST after an uncertain network failure", async () => {
  let calls = 0;
  await assert.rejects(() => render(async () => { calls++; throw new Error("Network failure with private details"); }), /Cannot reach the Render API/);
  assert.equal(calls, 1);
});
test("Render deploy cannot wait forever", async () => {
  await assert.rejects(() => render(async (_url, options) => options.method === "POST" ? json({ id: "dep-example" }) : json({ status: "build_in_progress" }), 1), /timed out/);
});

test("smoke test checks the web, proxy, database and products without mutations", async () => {
  const paths = [];
  await checkDeployment("https://web.example", { bypass: "test-bypass", fetchImpl: async (url, options) => {
    paths.push(new URL(url).pathname);
    assert.equal(options.method, undefined);
    assert.equal(options.headers["x-vercel-protection-bypass"], "test-bypass");
    if (url.endsWith("/")) return new Response("<html lang='vi'>BrewLite</html>");
    return url.includes("health") ? json({ status: "ok", db: "up" }) : json({ data: [] });
  } });
  assert.deepEqual(paths, ["/", "/api/health", "/api/products"]);
});
test("smoke test refuses a login/error HTML page masquerading as API success", async () => {
  await assert.rejects(() => checkDeployment("https://api.example/api", { apiOnly: true, fetchImpl: async () => new Response("login", { headers: { "content-type": "text/html" } }) }), /expected JSON/);
});
test("smoke test rejects an unavailable database", async () => {
  await assert.rejects(() => checkDeployment("https://api.example/api", { apiOnly: true, fetchImpl: async () => json({ status: "ok", db: "down" }) }), /health check failed/);
});
test("smoke test rejects an HTTP failure", async () => {
  await assert.rejects(() => checkDeployment("https://api.example/api", { apiOnly: true, fetchImpl: async () => json({}, 503) }), /HTTP 503/);
});
test("smoke test rejects an unrelated products endpoint", async () => {
  await assert.rejects(() => checkDeployment("https://api.example/api", { apiOnly: true, fetchImpl: async (url) => url.includes("health") ? json({ status: "ok", db: "up" }) : json({ items: [] }) }), /unexpected response shape/);
});
