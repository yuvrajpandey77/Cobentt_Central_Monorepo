/**
 * Live smoke test against E2B. Creates a real cloud computer for a throwaway owner,
 * runs a command, writes and reads a file, lists the workspace, then stops it.
 * Run with: npx tsx --env-file=.env scripts/cloud-computer/live-smoke.ts
 */
import { e2bBackend, ownerTag } from "../../src/lib/cloud-computer/backend";
import { CloudComputerService } from "../../src/lib/cloud-computer/service";

async function main() {
  if (!process.env.E2B_API_KEY) throw new Error("E2B_API_KEY is not set");
  const owner = ownerTag(`smoke-${Date.now()}`);
  const service = new CloudComputerService(e2bBackend);

  const log = (step: string, detail: unknown) => console.log(`✔ ${step}`, typeof detail === "string" ? detail : JSON.stringify(detail));

  const started = await service.start(owner);
  log("start", { status: started.status, network: started.network, workspace: started.workspacePath });

  const ran = await service.exec(owner, "echo cobentt-ok && uname -s");
  log("exec", { status: ran.status, stdout: ran.stdout.trim() });
  if (ran.status !== "succeeded" || !ran.stdout.includes("cobentt-ok")) throw new Error("command did not run");

  await service.writeFile(owner, "smoke/hello.txt", "hello from the cloud computer");
  const read = await service.readFile(owner, "smoke/hello.txt");
  log("file round-trip", read.content);
  if (read.content !== "hello from the cloud computer") throw new Error("file content mismatch");

  const listing = await service.listFiles(owner, "/workspace/smoke");
  log("list", listing.entries.map((e) => `${e.name} (${e.type})`));

  const denied = await service.exec(owner, "echo nope").then(() => "ran", () => "rejected");
  log("second command reuses the same computer", denied);

  const stopped = await service.stop(owner);
  log("stop", { status: stopped.status });
  console.log("LIVE SMOKE PASSED");
}

main().catch((err) => {
  console.error("LIVE SMOKE FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
