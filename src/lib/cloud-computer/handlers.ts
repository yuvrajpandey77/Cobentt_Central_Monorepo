import type { CloudComputerService, CommandRecord } from "./service";
import { PathError } from "./paths";
import { CommandError } from "./risk";
import { UrlError, assertPublicUrl } from "./network";
import { decodeBrowserId, encodeBrowserId, type PageRead } from "./browse";
import {
  appendEvent,
  listTasks,
  loadTask,
  newTask,
  saveTask,
  TaskError,
  type StoredTask,
  type TaskStatus,
} from "./tasks";

/**
 * HTTP surface of the cloud computer. It implements the same routes the mobile app
 * already calls on a user's own agent server, so the app works unchanged.
 */
export interface CloudDeps {
  service: CloudComputerService;
  userIdFrom: (req: Request) => Promise<string | null>;
  rateLimit: (key: string, perMinute: number) => Promise<boolean>;
  sendEvent: (name: string, data: Record<string, unknown>) => Promise<void>;
  readPage: (url: string) => Promise<PageRead>;
  now: () => Date;
  /** Token echoed back from /session, so the app keeps using the Clerk token it already has. */
  tokenFrom: (req: Request) => string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

const fail = (status: number, message: string) => json({ error: { message } }, status);

async function body(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > 64_000) throw new CommandError("That request is too large.");
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    throw new CommandError("The request wasn't valid JSON.");
  }
}

const str = (v: unknown, field: string): string => {
  if (typeof v !== "string") throw new CommandError(`Missing ${field}.`);
  return v;
};

/** Maps the app's task status to the one the mobile client understands. */
function toAgentTask(t: StoredTask) {
  const status: TaskStatus = t.status;
  return {
    id: t.id,
    title: t.title,
    prompt: t.prompt,
    kind: t.kind,
    status,
    plan: t.plan.map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status === "skipped" ? "pending" : s.status,
      detail: s.detail,
    })),
    evidence: [],
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    result: t.result,
    error: t.error ?? null,
    attempts: t.attempts,
  };
}

function toRunEvents(t: StoredTask) {
  return t.events.map((e) => ({ id: e.id, taskId: e.taskId, date: e.date, kind: e.kind, title: e.title, detail: e.detail }));
}

const CONTROL: Record<string, { from: TaskStatus[]; to: TaskStatus; resend: boolean }> = {
  pause: { from: ["queued", "running"], to: "paused", resend: false },
  resume: { from: ["paused", "failed"], to: "queued", resend: true },
  cancel: { from: ["queued", "running", "waiting_approval", "paused", "failed"], to: "cancelled", resend: false },
  retry: { from: ["failed", "cancelled"], to: "queued", resend: true },
};

/**
 * The mobile client speaks the agent-server protocol, whose paths already start
 * with `/api` (`/api/session`, `/api/workspace`, …). This route is mounted at
 * `/api/cloud-computer`, so those requests arrive as `["api", "session"]`.
 * Accept the prefix as well as the bare path so both the app and direct callers work.
 */
function normalizePath(path: string[]): string[] {
  return path[0] === "api" ? path.slice(1) : path;
}

export async function handleCloudComputer(req: Request, rawPath: string[], deps: CloudDeps): Promise<Response> {
  const path = normalizePath(rawPath);
  try {
    if (req.method === "GET" && path.join("/") === "health") return json({ status: "ok", mode: "live" });
    const userId = await deps.userIdFrom(req);
    if (!userId) return fail(401, "Sign in to use your cloud computer.");
    return await dispatch(req, path, userId, deps);
  } catch (err) {
    if (err instanceof CommandError || err instanceof PathError || err instanceof TaskError || err instanceof UrlError) {
      return fail(400, err.message);
    }
    console.error("[cloud-computer]", err instanceof Error ? err.message : "unknown error");
    return fail(500, "Something went wrong on your cloud computer. Try again.");
  }
}

async function dispatch(req: Request, path: string[], userId: string, deps: CloudDeps): Promise<Response> {
  const { service } = deps;
  const m = req.method;
  const route = path.join("/");

  if (m === "POST" && route === "session") return json({ token: deps.tokenFrom(req), mode: "live" });

  if (m === "GET" && route === "workspace") {
    const current = await service.current(userId);
    const tasks = current ? await listTasks(current.computer) : [];
    const actions = tasks
      .filter((t) => t.status === "waiting_approval" && t.planHash)
      .map((t) => ({
        id: t.id,
        title: t.title,
        kind: "shell",
        status: "awaiting_review",
        hash: t.planHash,
        data: { commands: t.plan.map((s) => s.command) },
      }));
    return json({
      mode: "live",
      profile: { name: "", email: "" },
      mail: [],
      events: [],
      browsers: [],
      connections: [],
      runtime: { provider: "e2b", configured: Boolean(process.env.E2B_API_KEY) },
      actions,
    });
  }

  if (m === "GET" && route === "agent") {
    const current = await service.current(userId);
    const tasks = current ? await listTasks(current.computer) : [];
    return json({
      tasks: tasks.map(toAgentTask),
      goals: [],
      monitors: [],
      ideas: [],
      notifications: [],
      identity: { name: "Coby" },
      worker: { running: true },
    });
  }
  if (m === "GET" && route === "agent/notifications") return json([]);
  if (m === "POST" && /^agent\/notifications\/[^/]+\/read$/.test(route)) return json({});

  if (m === "POST" && route === "agent/tasks") {
    if (!(await deps.rateLimit(`cc:task:${userId}`, 10))) return fail(429, "Too many tasks. Wait a minute and try again.");
    const input = await body(req);
    const task = newTask(str(input.prompt, "prompt"), deps.now(), typeof input.title === "string" ? input.title : undefined);
    const computer = await service.ensure(userId);
    const saved = appendEvent({ ...task, status: "queued" }, { kind: "status", title: "Queued", detail: "Waiting for the cloud computer." }, deps.now());
    await saveTask(computer, saved);
    await deps.sendEvent("personal/run-task", { userId, taskId: saved.id });
    return json(toAgentTask(saved));
  }

  const taskMatch = route.match(/^agent\/tasks\/([^/]+)(\/control|\/input)?$/);
  if (taskMatch) {
    const taskId = decodeURIComponent(taskMatch[1]!);
    const action = taskMatch[2];
    const current = await service.current(userId);
    if (!current) return fail(404, "That task doesn't exist.");
    const stored = await loadTask(current.computer, taskId);
    if (!stored) return fail(404, "That task doesn't exist.");

    if (m === "GET" && !action) {
      return json({ task: toAgentTask(stored), events: toRunEvents(stored), browsers: [], files: [], artifacts: [] });
    }
    if (m === "POST" && action === "/control") {
      const input = await body(req);
      const rule = CONTROL[str(input.action, "action")];
      if (!rule) return fail(400, "Unknown task action.");
      if (!rule.from.includes(stored.status)) return fail(409, `This task can't be ${str(input.action, "action")} right now.`);
      const now = deps.now();
      const next = appendEvent({ ...stored, status: rule.to, attempts: rule.resend ? stored.attempts + 1 : stored.attempts }, { kind: "status", title: `Task ${rule.to.replace("_", " ")}`, detail: `Changed by you (${input.action}).` }, now);
      await saveTask(current.computer, next);
      if (rule.resend) await deps.sendEvent("personal/run-task", { userId, taskId });
      return json(toAgentTask(next));
    }
    if (m === "POST" && action === "/input") {
      return fail(409, "This task isn't waiting for an answer.");
    }
  }

  if (m === "POST" && /^actions\/[^/]+\/decide$/.test(route)) {
    const taskId = decodeURIComponent(route.split("/")[1]!);
    const input = await body(req);
    const decision = input.decision === "approve" ? "approve" : input.decision === "deny" ? "deny" : null;
    if (!decision) return fail(400, "Choose approve or deny.");
    const current = await service.current(userId);
    const stored = current ? await loadTask(current.computer, taskId) : null;
    if (!stored || stored.status !== "waiting_approval" || !stored.planHash) return fail(404, "That approval doesn't exist.");
    if (input.hash !== stored.planHash) return fail(409, "This approval is out of date. Review the task again.");
    await deps.sendEvent("personal/approval.decided", { userId, taskId, hash: stored.planHash, decision });
    return json({
      id: taskId,
      title: stored.title,
      kind: "shell",
      data: { commands: stored.plan.map((s) => s.command) },
      status: decision === "approve" ? "executing" : "denied",
      hash: stored.planHash,
    });
  }

  if (m === "POST" && (route === "google/connect")) return fail(501, "Google accounts aren't connected to the cloud computer yet.");
  if (m === "POST" && route === "google/disconnect") return json({ ok: false });

  if (m === "GET" && route === "computer") return json(await service.snapshot(userId));
  if (m === "POST" && route === "computer/start") return json(await service.start(userId));
  if (m === "POST" && route === "computer/stop") return json(await service.stop(userId));

  if (m === "POST" && route === "computer/commands") {
    if (!(await deps.rateLimit(`cc:exec:${userId}`, 60))) return fail(429, "Too many commands. Wait a moment.");
    const record: CommandRecord = await service.exec(userId, str((await body(req)).command, "command"));
    return json(record);
  }

  if (m === "GET" && route === "computer/files") {
    const url = new URL(req.url);
    return json(await service.listFiles(userId, url.searchParams.get("path") ?? undefined));
  }
  if (m === "POST" && route === "computer/files/read") {
    return json(await service.readFile(userId, str((await body(req)).path, "path")));
  }
  if (m === "POST" && route === "computer/files/write") {
    const input = await body(req);
    await service.writeFile(userId, str(input.path, "path"), str(input.content, "content"));
    return json({ ok: true });
  }
  if (m === "POST" && route === "computer/files/mkdir") {
    await service.makeDirectory(userId, str((await body(req)).path, "path"));
    return json({ ok: true });
  }

  if (m === "POST" && route === "browsers") {
    const url = await assertPublicUrl(str((await body(req)).url, "url"));
    return json(session(url.href, "idle", deps.now()));
  }
  const browserMatch = route.match(/^browsers\/([^/]+)(\/read|\/navigate|\/close|\/reopen)?$/);
  if (browserMatch) {
    const url = decodeBrowserId(browserMatch[1]!);
    const action = browserMatch[2];
    if (m === "GET" && !action) return json(session(url, "idle", deps.now()));
    if (m === "GET" && action === "/read") return json(await deps.readPage(url));
    if (m === "POST" && action === "/navigate") {
      const next = await assertPublicUrl(str((await body(req)).url, "url"));
      return json(session(next.href, "idle", deps.now()));
    }
    if (m === "POST" && action === "/close") return json(session(url, "closed", deps.now()));
    if (m === "POST" && action === "/reopen") return json(session(url, "idle", deps.now()));
  }

  return fail(404, "Not found.");
}

function session(url: string, status: "idle" | "closed", now: Date) {
  const host = new URL(url).hostname.replace(/^www\./, "");
  return { id: encodeBrowserId(url), title: host, url, status, updatedAt: now.toISOString() };
}
