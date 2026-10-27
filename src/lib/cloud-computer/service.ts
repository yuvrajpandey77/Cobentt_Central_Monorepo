import { COMMAND_TIMEOUT_MS, type Computer, type ComputerBackend, type FileEntry } from "./backend";
import { capOutput } from "./output";
import { PathError, resolveWorkspacePath, WORKSPACE } from "./paths";
import { validateCommand } from "./risk";
import { randomUUID } from "node:crypto";

/** Hidden state folder inside the user's workspace. Nothing here needs a database. */
export const STATE_DIR = `${WORKSPACE}/.cobentt`;
export const HISTORY_PATH = `${STATE_DIR}/history.json`;
const MAX_HISTORY = 50;

export interface CommandRecord {
  id: string;
  command: string;
  cwd: string;
  status: "running" | "succeeded" | "failed" | "timed_out" | "interrupted";
  exitCode?: number;
  stdout: string;
  stderr: string;
  truncated: boolean;
  startedAt: string;
  completedAt?: string;
}

export interface ComputerSnapshotData {
  enabled: true;
  provider: "e2b";
  status: "running" | "stopped";
  workspacePath: string;
  network: "enabled" | "disabled";
  message?: string;
  commands: CommandRecord[];
}

/** Network is on by default so the agent can fetch packages and pages. Set COMPUTER_NETWORK=disabled to turn it off for everyone. */
export function defaultNetwork(): "enabled" | "disabled" {
  return process.env.COMPUTER_NETWORK === "disabled" ? "disabled" : "enabled";
}

export class CloudComputerService {
  constructor(
    private readonly backend: ComputerBackend,
    private readonly now: () => Date = () => new Date()
  ) {}

  /** The user's running computer, connected and kept alive, or null when none exists. */
  async current(owner: string): Promise<{ computer: Computer; paused: boolean } | null> {
    const found = await this.backend.find(owner);
    if (!found) return null;
    try {
      const computer = await this.backend.connect(found.id);
      return { computer, paused: found.state === "paused" };
    } catch (err) {
      // Listing can still show a computer that was just killed. Treat only "gone" as gone:
      // any other failure must surface, or a retry could start a second, billed computer.
      if (err instanceof Error && /not found/i.test(err.message)) return null;
      throw err;
    }
  }

  /** The running computer, starting one if needed. Used by every action that needs it. */
  async ensure(owner: string): Promise<Computer> {
    const existing = await this.current(owner);
    if (existing) return existing.computer;
    return this.backend.start(owner, { network: defaultNetwork() === "enabled" });
  }

  async snapshot(owner: string): Promise<ComputerSnapshotData> {
    const existing = await this.current(owner);
    const base = {
      enabled: true as const,
      provider: "e2b" as const,
      workspacePath: WORKSPACE,
      network: defaultNetwork(),
    };
    if (!existing) {
      return { ...base, status: "stopped", message: "Your cloud computer is off. Start it to run commands and edit files.", commands: [] };
    }
    if (existing.paused) {
      return { ...base, status: "stopped", message: "Your cloud computer is paused. Start it to resume.", commands: [] };
    }
    return { ...base, status: "running", commands: await this.readHistory(existing.computer) };
  }

  async start(owner: string): Promise<ComputerSnapshotData> {
    await this.ensure(owner);
    return this.snapshot(owner);
  }

  async stop(owner: string): Promise<ComputerSnapshotData> {
    const existing = await this.current(owner);
    if (existing) await existing.computer.kill();
    return this.snapshot(owner);
  }

  /** A command the user typed in the Terminal. The user is the operator, so it runs directly. */
  async exec(owner: string, rawCommand: string): Promise<CommandRecord> {
    const command = validateCommand(rawCommand);
    const computer = await this.ensure(owner);
    const started = this.now().toISOString();
    const result = await computer.run(command, { cwd: WORKSPACE, timeoutMs: COMMAND_TIMEOUT_MS });
    const stdout = capOutput(result.stdout);
    const stderr = capOutput(result.stderr, 2000);
    const record: CommandRecord = {
      id: randomUUID(),
      command,
      cwd: WORKSPACE,
      status: result.timedOut ? "timed_out" : result.exitCode === 0 ? "succeeded" : "failed",
      exitCode: result.exitCode,
      stdout: stdout.text,
      stderr: stderr.text,
      truncated: stdout.truncated || stderr.truncated,
      startedAt: started,
      completedAt: this.now().toISOString(),
    };
    await this.appendHistory(computer, record);
    return record;
  }

  async listFiles(owner: string, path?: string): Promise<{ path: string; entries: FileEntry[] }> {
    const dir = resolveWorkspacePath(path);
    const computer = await this.ensure(owner);
    const entries = await computer.list(dir);
    return { path: dir, entries: entries.filter((e) => !e.name.startsWith(".cobentt")) };
  }

  async readFile(owner: string, path: string): Promise<{ path: string; content: string }> {
    const file = resolveWorkspacePath(path);
    const computer = await this.ensure(owner);
    return { path: file, content: await computer.read(file) };
  }

  async writeFile(owner: string, path: string, content: string): Promise<void> {
    const file = resolveWorkspacePath(path);
    if (file === STATE_DIR || file.startsWith(`${STATE_DIR}/`)) throw new PathError("That folder is managed by Cobentt.");
    const computer = await this.ensure(owner);
    await computer.write(file, content);
  }

  async makeDirectory(owner: string, path: string): Promise<void> {
    const dir = resolveWorkspacePath(path);
    const computer = await this.ensure(owner);
    await computer.makeDir(dir);
  }

  private async readHistory(computer: Computer): Promise<CommandRecord[]> {
    try {
      const parsed = JSON.parse(await computer.read(HISTORY_PATH)) as unknown;
      return Array.isArray(parsed) ? (parsed as CommandRecord[]) : [];
    } catch {
      return [];
    }
  }

  private async appendHistory(computer: Computer, record: CommandRecord): Promise<void> {
    const history = [...(await this.readHistory(computer)), record].slice(-MAX_HISTORY);
    await computer.makeDir(STATE_DIR).catch(() => undefined);
    await computer.write(HISTORY_PATH, JSON.stringify(history));
  }
}

