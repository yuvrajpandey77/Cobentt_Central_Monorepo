import { handleCloudComputer, productionDeps } from "@/lib/cloud-computer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Starting a computer and running commands can take a while on a cold sandbox.
export const maxDuration = 60;

type Context = { params: Promise<{ path: string[] }> };

async function handle(req: Request, context: Context): Promise<Response> {
  const { path } = await context.params;
  return handleCloudComputer(req, path, productionDeps());
}

export const GET = handle;
export const POST = handle;
