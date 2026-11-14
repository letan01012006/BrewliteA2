import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

export async function deployRender({ serviceId, token, commit, fetchImpl = fetch, wait = delay, attempts = 100 }) {
  if (!/^srv-[a-zA-Z0-9]+$/.test(serviceId ?? "") || !token || !/^[a-f0-9]{40}$/.test(commit ?? "")) {
    throw new Error("Set RENDER_SERVICE_ID, RENDER_API_KEY and a full Git commit SHA.");
  }
  const endpoint = `https://api.render.com/v1/services/${serviceId}/deploys`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  async function request(url, options = {}) {
    let response;
    try {
      response = await fetchImpl(url, { ...options, headers, redirect: "error", signal: AbortSignal.timeout(30000) });
    } catch {
      throw new Error("Cannot reach the Render API; inspect the service dashboard before retrying a deploy.");
    }
    if (!response.ok) throw new Error(`Render API returned HTTP ${response.status}.`);
    return response.json();
  }
  // No automatic retry of POST: a lost response might already have started a deploy.
  const created = await request(endpoint, { method: "POST", body: JSON.stringify({ commitId: commit }) });
  if (!/^dep-[a-zA-Z0-9]+$/.test(created.id ?? "")) throw new Error("Render did not return a deploy ID.");
  console.log(`Render deploy ${created.id}: commit ${commit}`);
  const failed = new Set(["build_failed", "update_failed", "pre_deploy_failed", "canceled", "deactivated"]);
  for (let attempt = 0; attempt < attempts; attempt++) {
    const current = await request(`${endpoint}/${created.id}`);
    if (current.status === "live") {
      if (current.commit?.id !== commit) throw new Error("The live Render deploy does not match the requested commit.");
      console.log("Render backend is live at the requested commit.");
      return created.id;
    }
    if (failed.has(current.status)) throw new Error(`Render deployment failed: ${current.status}.`);
    await wait(10000);
  }
  throw new Error("Render deployment timed out; inspect its status before retrying.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await deployRender({ serviceId: process.env.RENDER_SERVICE_ID, token: process.env.RENDER_API_KEY, commit: process.env.DEPLOY_SHA });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
