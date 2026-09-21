/**
 * Web3Forms integration for Cobentt contact + feedback loop.
 *
 * The access key is public by design (it is meant for client-side use).
 * It can be overridden with NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY.
 *
 * Docs: https://docs.web3forms.com
 */

export const WEB3FORMS_ACCESS_KEY =
  process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY ??
  "3bf4e2b0-560c-4ab7-8154-9fcfb8a25f8e";

export const SUPPORT_EMAIL = "support@cogerphere.com";
export const COGERPHERE_URL = "https://cogerphere.com";

const ENDPOINT = "https://api.web3forms.com/submit";

export type ContactTopic =
  | "general"
  | "issue"
  | "integration"
  | "feedback"
  | "feature";

export const CONTACT_TOPICS: { value: ContactTopic; label: string }[] = [
  { value: "general", label: "General question" },
  { value: "issue", label: "Report an issue / bug" },
  { value: "integration", label: "Industry-level integration / Enterprise" },
  { value: "feedback", label: "Product feedback" },
  { value: "feature", label: "Feature request" },
];

export interface Web3FormsPayload {
  name: string;
  email: string;
  message: string;
  subject?: string;
  topic?: string;
  company?: string;
  rating?: number;
  pageUrl?: string;
  fromName?: string;
}

export interface Web3FormsResult {
  ok: boolean;
  error?: string;
}

/**
 * Submit a form payload to Web3Forms. Safe to call from client components.
 */
export async function submitToWeb3Forms(
  payload: Web3FormsPayload,
): Promise<Web3FormsResult> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        from_name: payload.fromName ?? "Cobentt Website",
        subject:
          payload.subject ??
          `[Cobentt] ${payload.topic ?? "Contact"} — ${payload.name}`,
        name: payload.name,
        email: payload.email,
        message: payload.message,
        topic: payload.topic,
        company: payload.company,
        rating: payload.rating,
        page_url: payload.pageUrl,
        // Honeypot field (must stay empty) — bots fill it, humans don't.
        botcheck: false,
      }),
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data?.success) return { ok: true };
    return {
      ok: false,
      error: data?.message ?? `Submission failed (HTTP ${res.status})`,
    };
  } catch {
    return { ok: false, error: "Network error. Please try again." };
  }
}
