import crypto from "crypto";

function safeHexEqual(a: string, b: string): boolean {
  if (!/^[0-9a-fA-F]+$/.test(a) || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

/** Checkout signature: HMAC-SHA256(order_id|payment_id) with the API key secret. */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string, keySecret: string): boolean {
  if (!keySecret) return false;
  const expected = crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeHexEqual(signature, expected);
}

/** Webhook signature: HMAC-SHA256(raw body) with the webhook secret. Never parse the body before this. */
export function verifyWebhookSignature(rawBody: string, signature: string, webhookSecret: string): boolean {
  if (!webhookSecret) return false;
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return safeHexEqual(signature, expected);
}
