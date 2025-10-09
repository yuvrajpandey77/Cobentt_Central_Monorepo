import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pagePath, value } = body ?? {};
    if (!pagePath || !value) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }
    // For now, just log to server console. In production, persist to DB or analytics.
    console.log("docs.feedback", { pagePath, value, at: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}


