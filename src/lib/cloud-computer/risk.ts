/**
 * Command risk rules for the cloud computer.
 *
 * Commands the user types into the Terminal run directly: the user is the operator.
 * Commands the agent proposes go through these rules first. Anything that touches
 * the host outside /workspace, escalates privilege, deletes recursively, opens a
 * network connection to another host, or runs a downloaded script needs an explicit
 * approval from the user before it runs.
 *
 * These rules are a guardrail, not a sandbox. The E2B microVM is the isolation boundary.
 */

export const MAX_COMMAND_LENGTH = 2000;

const RULES: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bsudo\b|\bsu\s+-?\s*(root)?\b/, reason: "uses sudo or switches user" },
  { pattern: /\brm\s+(-[a-zA-Z]*[rR][a-zA-Z]*|--recursive)\b/, reason: "deletes files recursively" },
  { pattern: /\b(mkfs|dd|shutdown|reboot|halt|poweroff|mount|umount)\b/, reason: "changes the machine itself" },
  { pattern: /\b(chmod|chown)\s+(-[a-zA-Z]*R[a-zA-Z]*|--recursive)\b/, reason: "changes permissions recursively" },
  { pattern: /\b(curl|wget)\b[^|;&]*\|\s*(sh|bash|zsh|python3?|node|perl)\b/, reason: "runs a downloaded script" },
  { pattern: /\b(ssh|scp|sftp|nc|ncat|netcat|telnet|rsync)\b/, reason: "connects to another host" },
  { pattern: /\b(kill|pkill|killall)\b/, reason: "stops processes" },
  { pattern: /\b(crontab|systemctl|service|useradd|passwd)\b/, reason: "changes system services or accounts" },
  { pattern: /\beval\b|\bbase64\s+(-d|--decode)\b|\bxxd\s+-r\b/, reason: "runs decoded or evaluated code" },
  { pattern: /\.\.\//, reason: "uses a parent-directory path" },
  { pattern: /(^|[\s;&|(>])\/(?!workspace(\/|\s|$)|tmp(\/|\s|$))[^\s;&|)]*/, reason: "uses a path outside /workspace" },
];

export interface CommandRisk {
  requiresApproval: boolean;
  reasons: string[];
}

export function classifyCommand(command: string): CommandRisk {
  const reasons = RULES.filter((r) => r.pattern.test(command)).map((r) => r.reason);
  return { requiresApproval: reasons.length > 0, reasons };
}

/** Rejects empty, oversized or control-character commands before anything runs. */
export function validateCommand(command: string): string {
  const trimmed = command.trim();
  if (!trimmed) throw new CommandError("Enter a command to run.");
  if (trimmed.length > MAX_COMMAND_LENGTH) {
    throw new CommandError(`Commands can be at most ${MAX_COMMAND_LENGTH} characters.`);
  }
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(trimmed)) {
    throw new CommandError("The command contains characters that can't be typed.");
  }
  return trimmed;
}

export class CommandError extends Error {}
