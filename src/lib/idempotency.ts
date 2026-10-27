import prisma from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { decide, hashBody } from "@/lib/idempotency-core";

export { IDEMPOTENCY_HEADER, decide, hashBody, parseKey } from "@/lib/idempotency-core";

const JSON_HEADERS = { "Content-Type": "application/json" };

/**
 * Runs `handler` at most once per (user, scope, key). The first response is stored and replayed to repeats.
 * A key reused with a different body is refused. If the handler throws, the reservation is released so a retry can run.
 */
export async function withIdempotency(
  userId: string,
  scope: string,
  key: string,
  raw: string,
  handler: () => Promise<Response>,
): Promise<Response> {
  const requestHash = hashBody(raw);

  try {
    await prisma.idempotencyKey.create({ data: { userId, scope, key, requestHash } });
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") throw err;
    const stored = await prisma.idempotencyKey.findUnique({
      where: { userId_scope_key: { userId, scope, key } },
      select: { requestHash: true, status: true, responseBody: true },
    });
    const decision = decide(stored, requestHash);
    if (decision.action === "conflict") {
      return Response.json({ error: "This request key was already used for a different request." }, { status: 422 });
    }
    if (decision.action === "in_progress") {
      return Response.json({ error: "This request is still being processed. Please wait a moment." }, { status: 409 });
    }
    if (decision.action === "replay") {
      return new Response(decision.body, { status: decision.status, headers: JSON_HEADERS });
    }
  }

  let response: Response;
  try {
    response = await handler();
  } catch (err) {
    await prisma.idempotencyKey.delete({ where: { userId_scope_key: { userId, scope, key } } }).catch(() => undefined);
    throw err;
  }

  const body = await response.clone().text();
  await prisma.idempotencyKey.update({
    where: { userId_scope_key: { userId, scope, key } },
    data: { status: response.status, responseBody: body, completedAt: new Date() },
  });
  return response;
}
