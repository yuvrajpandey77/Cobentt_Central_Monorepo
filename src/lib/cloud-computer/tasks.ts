import { createHash, randomUUID } from "node:crypto";
import type { Computer } from "./backend";
import { STATE_DIR } from "./service";
import { classifyCommand, validateCommand } from "./risk";

/**
 * Personal agent tasks. A task is a plan (steps with commands) plus the events from
 * running it. Both live as one JSON file in the user's computer, so they survive
 * a phone that closes and need no extra database table.
 */
export const TASKS_DIR = `${STATE_DIR}/tasks`;
export const MAX_STEPS = 8;
export const MAX_PROMPT = 2000;

export type TaskStatus = "queued" | "running" | "waiting_approval" | "paused" | "succeeded" | "failed" | "cancelled";

export interface TaskStep {
  id: string;
  title: string;
  command: string;
  status: "pending" | "running" | "succeeded" | "failed" | "skipped";
  detail?: string;
}

export interface TaskEvent {
  id: string;
  taskId: string;
  date: string;
  kind: "plan" | "step" | "observation" | "approval" | "result" | "error" | "status";
  title: string;
  detail: string;
}

export interface StoredTask {
  id: string;
  title: string;
  prompt: string;
  kind: "agent";
  status: TaskStatus;
  plan: TaskStep[];
  planHash?: string;
  /** Hash of the plan the user approved. A resumed run skips approval only when it matches. */
  approvedHash?: string;
  result?: string;
  error?: string | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  events: TaskEvent[];
}

export function taskPath(id: string): string {
  if (!/^[a-z0-9-]{8,64}$/i.test(id)) throw new TaskError("That task doesn't exist.");
  return `${TASKS_DIR}/${id}.json`;
}

export class TaskError extends Error {}

export function newTask(prompt: string, now: Date, title?: string): StoredTask {
  const text = prompt.trim();
  if (!text) throw new TaskError("Describe what you want done.");
  if (text.length > MAX_PROMPT) throw new TaskError(`Tasks can be at most ${MAX_PROMPT} characters.`);
  const stamp = now.toISOString();
  const id = randomUUID();
  return {
    id,
    title: (title?.trim() || text).slice(0, 80),
    prompt: text,
    kind: "agent",
    status: "queued",
    plan: [],
    attempts: 0,
    createdAt: stamp,
    updatedAt: stamp,
    events: [],
  };
}

export async function loadTask(computer: Computer, id: string): Promise<StoredTask | null> {
  try {
    return JSON.parse(await computer.read(taskPath(id))) as StoredTask;
  } catch {
    return null;
  }
}

export async function saveTask(computer: Computer, task: StoredTask): Promise<void> {
  await computer.makeDir(STATE_DIR).catch(() => undefined);
  await computer.makeDir(TASKS_DIR).catch(() => undefined);
  await computer.write(taskPath(task.id), JSON.stringify(task));
}

export async function listTasks(computer: Computer): Promise<StoredTask[]> {
  let entries;
  try {
    entries = await computer.list(TASKS_DIR);
  } catch {
    return [];
  }
  const loaded = await Promise.all(
    entries
      .filter((e) => e.type === "file" && e.name.endsWith(".json"))
      .map((e) => loadTask(computer, e.name.replace(/\.json$/, "")))
  );
  return loaded.filter((t): t is StoredTask => t !== null).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Turns the model's JSON reply into a validated plan. Anything malformed is rejected. */
export function parsePlan(text: string): Array<Pick<TaskStep, "title" | "command">> {
  const json = text.match(/\{[\s\S]*\}/)?.[0] ?? "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new TaskError("The plan couldn't be read. Try again with a clearer request.");
  }
  const steps = (parsed as { steps?: unknown })?.steps;
  if (!Array.isArray(steps) || steps.length === 0) throw new TaskError("The plan had no steps.");
  if (steps.length > MAX_STEPS) throw new TaskError(`A plan can have at most ${MAX_STEPS} steps.`);
  return steps.map((raw, i) => {
    const s = raw as { title?: unknown; command?: unknown };
    const title = typeof s.title === "string" ? s.title.trim().slice(0, 120) : "";
    const command = typeof s.command === "string" ? validateCommand(s.command) : "";
    if (!title || !command) throw new TaskError(`Step ${i + 1} is missing a title or a command.`);
    return { title, command };
  });
}

/** Stable fingerprint of exactly what the user is asked to approve. */
export function planHash(steps: Array<Pick<TaskStep, "title" | "command">>): string {
  return createHash("sha256").update(JSON.stringify(steps.map((s) => [s.title, s.command]))).digest("hex").slice(0, 32);
}

/** Gives each planned command a durable id and a starting status. */
export function toSteps(plan: Array<Pick<TaskStep, "title" | "command">>): TaskStep[] {
  return plan.map((s) => ({ id: randomUUID(), title: s.title, command: s.command, status: "pending" as const }));
}

export function stepsNeedingApproval(steps: Array<Pick<TaskStep, "command">>): string[] {
  return steps.filter((s) => classifyCommand(s.command).requiresApproval).map((s) => s.command);
}

export function appendEvent(task: StoredTask, event: Omit<TaskEvent, "id" | "taskId" | "date">, now: Date): StoredTask {
  return {
    ...task,
    updatedAt: now.toISOString(),
    events: [...task.events, { id: randomUUID(), taskId: task.id, date: now.toISOString(), ...event }].slice(-200),
  };
}
