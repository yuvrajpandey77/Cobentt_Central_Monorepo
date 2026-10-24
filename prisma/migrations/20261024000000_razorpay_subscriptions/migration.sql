-- Razorpay Subscriptions: one Plan id per tier and price, reused by every subscription.
CREATE TABLE "public"."billing_razorpay_plans" (
    "planKey" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "razorpayPlanId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_razorpay_plans_pkey" PRIMARY KEY ("planKey","amountPaise")
);

CREATE UNIQUE INDEX "billing_razorpay_plans_razorpayPlanId_key" ON "public"."billing_razorpay_plans"("razorpayPlanId");
