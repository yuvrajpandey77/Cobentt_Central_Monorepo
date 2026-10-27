export const MAX_OUTPUT_CHARS = 8000;

/** Caps command output so one noisy command can't flood the phone or the database. */
export function capOutput(text: string, max = MAX_OUTPUT_CHARS): { text: string; truncated: boolean } {
  if (text.length <= max) return { text, truncated: false };
  return { text: `${text.slice(0, max)}\n… (output truncated)`, truncated: true };
}
