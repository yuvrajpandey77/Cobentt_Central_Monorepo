import { createHash } from "node:crypto";
import { Sandbox } from "@e2b/code-interpreter";
import { WORKSPACE } from "./paths";

/**
 * The cloud computer's backend. The handlers talk to these interfaces only, so the
 * whole API can be tested with an in-memory fake. `e2bBackend` is the production adapter.
 */

/** Idle lifetime. Every request that uses the computer extends it. Hobby plans cap at 1 hour. */
export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
export const COMMAND_TIMEOUT_MS = 30_000;
export const TEMPLATE = process.env.E2B_COMPUTER_TEMPLATE || process.env.E2B_TEMPLATE || "cogerphereailabsbeta1";

export interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut?: boolean;
}

export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory" | "symlink";
  size: number;
}

export interface Computer {
  id: string;
  run(command: string, opts: { cwd: string; timeoutMs: number }): Promise<RunResult>;
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  list(path: string): Promise<FileEntry[]>;
  makeDir(path: string): Promise<void>;
  extend(ms: number): Promise<void>;
  kill(): Promise<void>;
}

export interface ComputerBackend {
  /** The user's running or paused computer, if any. */
  find(owner: string): Promise<{ id: string; state: "running" | "paused" } | null>;
  start(owner: string, opts: { network: boolean }): Promise<Computer>;
  connect(id: string): Promise<Computer>;
}

/** Stable, non-reversible owner tag. Raw user ids never go into a sandbox's metadata. */
export function ownerTag(userId: string): string {
  return createHash("sha256").update(`cloud-computer:${userId}`).digest("hex").slice(0, 40);
}

const KIND = "cloud-computer";

function isExitError(err: unknown): err is { exitCode: number; stdout: string; stderr: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: string }).name === "CommandExitError" &&
    typeof (err as { exitCode?: unknown }).exitCode === "number"
  );
}

function isTimeoutError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { name?: string }).name === "TimeoutError";
}

function wrap(sandbox: Sandbox): Computer {
  return {
    id: sandbox.sandboxId,
    async run(command, { cwd, timeoutMs }) {
      try {
        const r = await sandbox.commands.run(command, { cwd, timeoutMs });
        return { exitCode: r.exitCode, stdout: r.stdout, stderr: r.stderr };
      } catch (err) {
        // The SDK's error classes aren't re-exported by @e2b/code-interpreter, so match on shape.
        if (isExitError(err)) {
          return { exitCode: err.exitCode, stdout: err.stdout, stderr: err.stderr };
        }
        if (isTimeoutError(err)) {
          return { exitCode: -1, stdout: "", stderr: "The command took too long and was stopped.", timedOut: true };
        }
        throw err;
      }
    },
    read: (path) => sandbox.files.read(path),
    async write(path, content) {
      await sandbox.files.write(path, content);
    },
    async list(path) {
      const entries = await sandbox.files.list(path);
      return entries.map((e) => ({
        name: e.name,
        path: e.path,
        type: String(e.type) === "dir" ? "directory" : String(e.type) === "symlink" ? "symlink" : "file",
        size: e.size,
      }));
    },
    async makeDir(path) {
      await sandbox.files.makeDir(path);
    },
    async extend(ms) {
      await sandbox.setTimeout(ms);
    },
    async kill() {
      await sandbox.kill();
    },
  };
}

export const e2bBackend: ComputerBackend = {
  async find(owner) {
    const paginator = Sandbox.list({
      query: { metadata: { owner, kind: KIND }, state: ["running", "paused"] },
      limit: 1,
    });
    const items = await paginator.nextItems();
    const first = items[0];
    if (!first) return null;
    return { id: first.sandboxId, state: (first as { state?: string }).state === "paused" ? "paused" : "running" };
  },
  async start(owner, { network }) {
    const sandbox = await Sandbox.create(TEMPLATE, {
      metadata: { owner, kind: KIND },
      timeoutMs: IDLE_TIMEOUT_MS,
      allowInternetAccess: network,
    });
    const computer = wrap(sandbox);
    // The template doesn't ship a workspace folder. Commands run there, so create it once.
    await computer.makeDir(WORKSPACE);
    return computer;
  },
  async connect(id) {
    const sandbox = await Sandbox.connect(id, { timeoutMs: IDLE_TIMEOUT_MS });
    return wrap(sandbox);
  },
};
