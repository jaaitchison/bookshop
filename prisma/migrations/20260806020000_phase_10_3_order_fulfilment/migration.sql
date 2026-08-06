-- Section 10.3 links each verified payment snapshot to exactly one order and
-- persists confirmation delivery so fulfilment survives webhook retries.
CREATE TYPE "OrderConfirmationStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED');

ALTER TABLE "Order" ADD COLUMN "paymentAttemptId" TEXT;

CREATE TABLE "OrderConfirmation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" "OrderConfirmationStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'resend',
    "providerMessageId" TEXT NOT NULL DEFAULT '',
    "failureMessage" TEXT NOT NULL DEFAULT '',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderConfirmation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Order_paymentAttemptId_key" ON "Order"("paymentAttemptId");
CREATE UNIQUE INDEX "OrderConfirmation_orderId_key" ON "OrderConfirmation"("orderId");
CREATE INDEX "OrderConfirmation_status_createdAt_idx" ON "OrderConfirmation"("status", "createdAt");

ALTER TABLE "Order" ADD CONSTRAINT "Order_paymentAttemptId_fkey"
FOREIGN KEY ("paymentAttemptId") REFERENCES "PaymentAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderConfirmation" ADD CONSTRAINT "OrderConfirmation_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
