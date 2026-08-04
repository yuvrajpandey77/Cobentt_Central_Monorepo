import prisma from "@/lib/db";
import { Prisma } from "@/generated/prisma";

export interface AuditLogParams {
  paymentRecordId?: string;
  clerkUserId?: string;
  event: string;
  actor?: "system" | "user" | "admin" | "webhook";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  correlationId?: string;
  ipAddress?: string;
  success?: boolean;
  details?: Record<string, string | number | boolean | null>;
  errorMessage?: string;
}

export async function logPaymentEvent(params: AuditLogParams): Promise<void> {
  try {
    await prisma.paymentAuditLog.create({
      data: {
        paymentRecordId: params.paymentRecordId,
        clerkUserId: params.clerkUserId,
        event: params.event,
        actor: params.actor ?? "system",
        razorpayOrderId: params.razorpayOrderId,
        razorpayPaymentId: params.razorpayPaymentId,
        correlationId: params.correlationId,
        ipAddress: params.ipAddress,
        success: params.success ?? true,
        details: (params.details ?? {}) as Prisma.InputJsonValue,
        errorMessage: params.errorMessage,
      },
    });
  } catch (err) {
    console.error("[payment-audit] Failed to log event:", params.event, err);
  }
}
