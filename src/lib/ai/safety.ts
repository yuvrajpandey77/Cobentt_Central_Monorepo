const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+(instructions?|prompts?|rules?)/i,
  /you\s+are\s+now\s+(a|an|the)\s+/i,
  /system\s*:\s*/i,
  /assistant\s*:\s*/i,
  /\[system\]/i,
  /\[INST\]/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /Human\s*:/i,
  /AI\s*:/i,
  /<\|system\|>/i,
  /<\|user\|>/i,
  /<\|assistant\|>/i,
  /```system/i,
  /```json\s*\{[\s\S]*"role"\s*:\s*"system"/i,
];

const INJECTION_PHRASES = [
  "disregard all previous instructions",
  "ignore your instructions",
  "you are now",
  "act as",
  "pretend you are",
  "roleplay as",
  "from now on you",
  "new instructions:",
  "override instructions",
  "forget everything",
];

export function detectPromptInjection(input: string): {
  safe: boolean;
  reason?: string;
} {
  const normalized = input.toLowerCase().trim();

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return {
        safe: false,
        reason: `Input contains potential prompt injection pattern`,
      };
    }
  }

  for (const phrase of INJECTION_PHRASES) {
    if (normalized.includes(phrase)) {
      return {
        safe: false,
        reason: `Input contains suspicious phrase: "${phrase}"`,
      };
    }
  }

  const repeatedChars = /(.)\1{20,}/;
  if (repeatedChars.test(input)) {
    return {
      safe: false,
      reason: "Input contains excessive character repetition",
    };
  }

  if (input.length > 0) {
    const nonPrintable = /[\x00-\x08\x0E-\x1F]/;
    if (nonPrintable.test(input)) {
      return {
        safe: false,
        reason: "Input contains non-printable control characters",
      };
    }
  }

  return { safe: true };
}

export function sanitizeUserInput(input: string): string {
  let sanitized = input;

  sanitized = sanitized.replace(/[\x00-\x08\x0E-\x1F]/g, "");

  if (sanitized.length > 10000) {
    sanitized = sanitized.slice(0, 10000);
  }

  return sanitized;
}
