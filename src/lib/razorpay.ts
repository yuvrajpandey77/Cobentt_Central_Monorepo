import Razorpay from "razorpay";

let _razorpay: Razorpay | null = null;

/** Shared Razorpay client (server-only). Throws if credentials are missing. */
export function getRazorpay(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay credentials not configured");
  if (!_razorpay) _razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return _razorpay;
}

export interface ProviderPayment {
  id: string;
  orderId: string;
  /** created | authorized | captured | refunded | failed */
  status: string;
  amountPaise: number;
  currency: string;
  captured: boolean;
}

/**
 * Fetch the payment from Razorpay's servers and confirm it belongs to the
 * given order. Never trust client-supplied payment status/amount alone —
 * always reconcile against the provider before granting entitlement.
 */
export async function fetchProviderPayment(
  razorpayOrderId: string,
  razorpayPaymentId: string
): Promise<ProviderPayment> {
  const payment = await getRazorpay().payments.fetch(razorpayPaymentId);
  const orderId = String((payment as { order_id?: unknown }).order_id ?? "");
  if (orderId !== razorpayOrderId) {
    throw new Error("Payment does not belong to this order");
  }
  return {
    id: String(payment.id),
    orderId,
    status: String(payment.status),
    amountPaise: Number((payment as { amount?: unknown }).amount),
    currency: String((payment as { currency?: unknown }).currency ?? ""),
    captured: Boolean((payment as { captured?: unknown }).captured),
  };
}

/**
 * Ensure an authorized payment is captured (auto-capture is the norm; this
 * covers merchants with manual capture enabled). Returns the final status.
 */
export async function ensurePaymentCaptured(
  providerPayment: ProviderPayment
): Promise<ProviderPayment> {
  if (providerPayment.status === "captured" || providerPayment.captured) {
    return { ...providerPayment, status: "captured", captured: true };
  }
  if (providerPayment.status !== "authorized") {
    return providerPayment;
  }
  const captured = await getRazorpay().payments.capture(
    providerPayment.id,
    providerPayment.amountPaise,
    providerPayment.currency
  );
  return {
    ...providerPayment,
    status: String(captured.status),
    captured: Boolean((captured as { captured?: unknown }).captured),
  };
}
