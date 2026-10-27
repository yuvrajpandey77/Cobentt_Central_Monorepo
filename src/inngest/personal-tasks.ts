import { NonRetriableError } from "inngest";
import { inngest } from "./client";
import { resolveByokCredential } from "@/lib/byok";
import { DEFAULT_MODEL } from "@/lib/models";
import { e2bBackend, COMMAND_TIMEOUT_MS } from "@/lib/cloud-computer/backend";
import { CloudComputerService } from "@/lib/cloud-computer/service";
import { capOutput } from "@/lib/cloud-computer/output";
import { WORKSPACE } from "@/lib/cloud-computer/paths";
import {
  appendEvent,
  loadTask,
  parsePlan,
  planHash,
  saveTask,
  stepsNeedingApproval,
  toSteps,
  type StoredTask,
  type TaskStatus,
  type TaskStep,
} from "@/lib/cloud-computer/tasks";
import { classifyCommand } from "@/lib/cloud-computer/risk";
import type { Computer } from "@/lib/cloud-computer/backend";

/**
 * Personal agent task runner. Runs durably on Inngest, inside the user's cloud computer.
 *
 * Plan first, then run. The model plans once and the plan is saved. Any step that
 * needs approval stops the run until the user approves exactly those commands (by
 * hash). Each step is its own durable Inngest step, so a closed phone, a pause, a
 * cancel or a redeploy never loses progress.
 */

const service = new CloudComputerService(e2bBackend);

const PLAN_SYSTEM = [
  "You plan work for a user's cloud Linux computer. Reply with JSON only, in this shape:",
  '{"steps":[{"title":"short title","command":"one shell command"}]}',
  "Use at most 8 steps. Every command must work inside /workspace and use standard tools.",
  "Never use sudo, recursive deletes, pipes from a download into a shell, or paths outside /workspace.",
  "If the task can't be done with commands, reply with one step whose command is echo followed by a short explanation.",
].join("\n");

const SUMMARY_SYSTEM =
  "Summarise what was done for the user in two to five short sentences. Say what worked and what didn't. Don't invent results.";

/** One model call, with the user's own key (BYOK) or the managed key. The key never leaves this function. */
async function callModel(userId: string, system: string, user: string): Promise<string> {
  const cred = await resolveByokCredential(userId, DEFAULT_MODEL);
  const res = await fetch(`${cred.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cred.apiKey}`, ...cred.extraHeaders },
    body: JSON.stringify({
      model: cred.model,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`The model returned HTTP ${res.status}.`);
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

async function requireTask(computer: Computer, taskId: string): Promise<StoredTask> {
  const task = await loadTask(computer, taskId);
  if (!task) throw new NonRetriableError("That task no longer exists.");
  return task;
}

async function setStatus(computer: Computer, task: StoredTask, status: TaskStatus, detail: { title: string; detail: string; kind: "status" | "error" | "approval" | "result" }, extra: Partial<StoredTask> = {}, now = new Date()) {
  const next = appendEvent({ ...task, ...extra, status }, detail, now);
  await saveTask(computer, next);
  return next;
}

export const runPersonalTask = inngest.createFunction(
  { id: "personal-run-task", retries: 1, concurrency: { limit: 2, key: "event.data.userId" } },
  { event: "personal/run-task" },
  async ({ event, step }) => {
    const { userId, taskId } = (event.data ?? {}) as { userId?: string; taskId?: string };
    if (!userId || !taskId) throw new NonRetriableError("personal/run-task needs a userId and a taskId");

    const gate = await step.run("load-task", async () => {
      const computer = await service.ensure(userId);
      const task = await requireTask(computer, taskId);
      if (task.status === "cancelled" || task.status === "paused" || task.status === "succeeded") {
        return { run: false, status: task.status };
      }
      return { run: true, status: task.status };
    });
    if (!gate.run) return { status: gate.status };

    try {
      // 1. Plan once. A resumed run reuses the saved plan.
      const plan = await step.run("plan", async () => {
        const computer = await service.ensure(userId);
        const task = await requireTask(computer, taskId);
        if (task.plan.length > 0) return task.plan.map(({ title, command }) => ({ title, command }));
        const steps = parsePlan(await callModel(userId, PLAN_SYSTEM, `Task: ${task.prompt}`));
        const now = new Date();
        const planned = appendEvent(
          { ...task, plan: toSteps(steps), planHash: planHash(steps), status: "running", attempts: task.attempts + 1 },
          { kind: "plan", title: `Planned ${steps.length} step${steps.length === 1 ? "" : "s"}`, detail: steps.map((s) => s.title).join("\n") },
          now
        );
        await saveTask(computer, planned);
        return steps;
      });

      // 2. Approval, once per plan. The approval is for the exact commands shown.
      const hash = planHash(plan);
      const needsApproval = await step.run("check-approval", async () => {
        const computer = await service.ensure(userId);
        const task = await requireTask(computer, taskId);
        return stepsNeedingApproval(plan).length > 0 && task.approvedHash !== hash;
      });

      if (needsApproval) {
        await step.run("ask-approval", async () => {
          const computer = await service.ensure(userId);
          const task = await requireTask(computer, taskId);
          const reasons = plan
            .map((s) => ({ ...s, reasons: classifyCommand(s.command).reasons }))
            .filter((s) => s.reasons.length > 0)
            .map((s) => `${s.title}: ${s.reasons.join(", ")}`);
          await setStatus(computer, task, "waiting_approval", { kind: "approval", title: "Needs your approval", detail: reasons.join("\n") }, { planHash: hash });
        });

        const decision = await step.waitForEvent("await-approval", {
          event: "personal/approval.decided",
          timeout: "24h",
          match: "data.taskId",
        });
        const approved = decision?.data?.decision === "approve" && decision?.data?.hash === hash;

        await step.run("record-approval", async () => {
          const computer = await service.ensure(userId);
          const task = await requireTask(computer, taskId);
          if (!approved) {
            const reason = decision ? "You declined the commands." : "No answer within 24 hours.";
            await setStatus(computer, task, "cancelled", { kind: "approval", title: "Not approved", detail: reason }, { error: reason });
            return;
          }
          await setStatus(computer, task, "running", { kind: "approval", title: "Approved", detail: "Running the approved commands." }, { approvedHash: hash });
        });
        if (!approved) return { status: "cancelled" };
      }

      // 3. Run each step as its own durable step. Stop as soon as the user pauses or cancels.
      for (let i = 0; i < plan.length; i++) {
        const outcome = await step.run(`run-step-${i}`, async () => {
          const computer = await service.ensure(userId);
          const task = await requireTask(computer, taskId);
          if (task.status !== "running") return { stop: true as const, status: task.status, ok: true };
          if (task.plan[i]?.status === "succeeded") return { stop: false as const, status: "running" as const, ok: true };

          const command = plan[i]!.command;
          const started = await computer.run(command, { cwd: WORKSPACE, timeoutMs: COMMAND_TIMEOUT_MS });
          const ok = started.exitCode === 0 && !started.timedOut;
          const output = capOutput(`${started.stdout}${started.stderr ? `\n[stderr]\n${started.stderr}` : ""}`, 2000).text;

          const steps: TaskStep[] = task.plan.map((s, idx) =>
            idx === i ? { ...s, status: ok ? "succeeded" : "failed", detail: output.slice(0, 500) } : s
          );
          const now = new Date();
          const withStep = appendEvent(
            { ...task, plan: steps },
            { kind: "observation", title: `${ok ? "Done" : "Failed"}: ${plan[i]!.title}`, detail: output || `Exit code ${started.exitCode}` },
            now
          );
          await saveTask(computer, withStep);
          return { stop: false as const, status: "running" as const, ok };
        });

        if (outcome.stop) return { status: outcome.status };
        if (!outcome.ok) {
          await step.run("mark-failed", async () => {
            const computer = await service.ensure(userId);
            const task = await requireTask(computer, taskId);
            await setStatus(computer, task, "failed", { kind: "error", title: "Stopped", detail: `Step ${i + 1} failed.` }, { error: `Step ${i + 1} failed.` });
          });
          return { status: "failed" };
        }
      }

      // 4. Summarise what happened and finish.
      await step.run("summarise", async () => {
        const computer = await service.ensure(userId);
        const task = await requireTask(computer, taskId);
        const results = task.events
          .filter((e) => e.kind === "observation")
          .map((e) => `${e.title}\n${e.detail}`)
          .join("\n\n")
          .slice(0, 6000);
        const summary = (await callModel(userId, SUMMARY_SYSTEM, `Task: ${task.prompt}\n\nResults:\n${results}`)).trim().slice(0, 2000);
        await setStatus(computer, task, "succeeded", { kind: "result", title: "Finished", detail: summary }, { result: summary, error: null });
      });
      return { status: "succeeded" };
    } catch (err) {
      if (err instanceof NonRetriableError) throw err;
      const message = err instanceof Error ? err.message : "The task stopped unexpectedly.";
      await step.run("record-error", async () => {
        const computer = await service.ensure(userId);
        const task = await requireTask(computer, taskId);
        await setStatus(computer, task, "failed", { kind: "error", title: "Stopped", detail: message }, { error: message });
      });
      return { status: "failed" };
    }
  }
);
