import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export async function verifyCi({ repository, commit, token, fetchImpl = fetch }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? "") || !/^[a-f0-9]{40}$/.test(commit ?? "") || !token) {
    throw new Error("Missing GitHub repository, commit or workflow token.");
  }
  async function get(path) {
    const result = await fetchImpl(`https://api.github.com/repos/${repository}/${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
      redirect: "error", signal: AbortSignal.timeout(30000),
    });
    if (!result.ok) throw new Error(`Cannot verify CI: GitHub HTTP ${result.status}.`);
    return result.json();
  }
  const main = await get("git/ref/heads/main");
  if (main.object?.sha !== commit) {
    console.log("Skipping an older revision: main has moved since this workflow started.");
    return false;
  }
  const runs = await get(`actions/workflows/ci.yml/runs?head_sha=${commit}&branch=main&per_page=100`);
  const latest = runs.workflow_runs?.filter((run) =>
    run.head_sha === commit && run.head_branch === "main" &&
    run.head_repository?.full_name === repository && ["push", "workflow_dispatch"].includes(run.event),
  ).sort((a, b) => b.run_number - a.run_number || b.run_attempt - a.run_attempt)[0];
  if (!latest || latest.status !== "completed" || latest.conclusion !== "success") {
    throw new Error("The latest CI run for this main commit has not passed. Run CI successfully first.");
  }
  console.log(`CI passed for ${commit}; run ${latest.id}.`);
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const current = await verifyCi({ repository: process.env.GITHUB_REPOSITORY, commit: process.env.DEPLOY_SHA, token: process.env.GH_TOKEN });
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `current=${current}\n`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
