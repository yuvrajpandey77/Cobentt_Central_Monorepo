import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(`default:${session.userId}`, RATE_LIMITS.default);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const { pagePath, value } = body ?? {};
    if (!pagePath || !value) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }
    // Local log for debugging/analytics pipelines.
    console.log("docs.feedback", { pagePath, value, at: new Date().toISOString() });

    // Forward docs page ratings into the shared Web3Forms feedback inbox so
    // the feedback loop stays in one place. Never fail the request if the
    // third-party call fails — local logging above is the fallback.
    try {
      const accessKey =
        process.env.WEB3FORMS_ACCESS_KEY ??
        process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY ??
        "3bf4e2b0-560c-4ab7-8154-9fcfb8a25f8e";
      await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: accessKey,
          from_name: "Cobentt Docs",
          subject: `[Cobentt] Docs feedback: ${value} — ${pagePath}`,
          name: "Docs feedback widget",
          email: "docs-feedback@cobentt.app",
          message: `Page: ${pagePath}\nRating: ${value}\nUser: ${session.userId}`,
          topic: "Docs feedback",
          page_url: pagePath,
          botcheck: false,
        }),
      });
    } catch {
      // Ignore — feedback was already logged locally.
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}


