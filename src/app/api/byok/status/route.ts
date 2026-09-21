import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getByokStatus } from "@/lib/byok";

export const dynamic = "force-dynamic";

/** Masked BYOK status for the client gate. Never includes key material. */
export async function GET() {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const status = await getByokStatus(session.userId);
  return NextResponse.json(status);
}
