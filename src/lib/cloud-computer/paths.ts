/** Every file the user or agent touches lives under /workspace. */
export const WORKSPACE = "/workspace";

export class PathError extends Error {}

/**
 * Resolves a user- or agent-supplied path to an absolute path inside /workspace.
 * Relative paths are taken from /workspace. Anything that escapes it is rejected.
 */
export function resolveWorkspacePath(input: string | undefined): string {
  const raw = (input ?? "").trim() || WORKSPACE;
  if (raw.includes("\0")) throw new PathError("That path isn't valid.");
  const joined = raw.startsWith("/") ? raw : `${WORKSPACE}/${raw}`;
  const parts: string[] = [];
  for (const segment of joined.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") throw new PathError("Paths can't go up out of /workspace.");
    parts.push(segment);
  }
  const normalized = `/${parts.join("/")}`;
  if (normalized !== WORKSPACE && !normalized.startsWith(`${WORKSPACE}/`)) {
    throw new PathError("Only /workspace is available on the cloud computer.");
  }
  return normalized;
}
