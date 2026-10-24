import { NextResponse } from "next/server";
import { publicCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

/** Public price list. Prices and API budgets come from the server catalog; token counts use live provider prices. */
export async function GET() {
  return NextResponse.json(await publicCatalog(), { headers: { "Cache-Control": "public, max-age=300" } });
}
