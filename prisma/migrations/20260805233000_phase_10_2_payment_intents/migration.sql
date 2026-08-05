CREATE TYPE "PaymentAttemptStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

CREATE TABLE "PaymentAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "cartId" TEXT,
  "stripePaymentIntentId" TEXT,
  "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'PENDING',
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'usd',
  "shippingName" TEXT NOT NULL,
  "shippingEmail" TEXT NOT NULL,
  "shippingAddress" TEXT NOT NULL,
  "shippingCity" TEXT NOT NULL,
  "shippingPostcode" TEXT NOT NULL,
  "failureMessage" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentAttemptItem" (
  "id" TEXT NOT NULL,
  "paymentAttemptId" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "titleSnapshot" TEXT NOT NULL,
  "authorSnapshot" TEXT NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  CONSTRAINT "PaymentAttemptItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "StripeWebhookEvent" ADD COLUMN "paymentAttemptId" TEXT;

CREATE UNIQUE INDEX "PaymentAttempt_stripePaymentIntentId_key" ON "PaymentAttempt"("stripePaymentIntentId");
CREATE INDEX "PaymentAttempt_userId_createdAt_idx" ON "PaymentAttempt"("userId", "createdAt");
CREATE INDEX "PaymentAttempt_cartId_idx" ON "PaymentAttempt"("cartId");
CREATE INDEX "PaymentAttempt_status_idx" ON "PaymentAttempt"("status");
CREATE UNIQUE INDEX "PaymentAttemptItem_paymentAttemptId_bookId_key" ON "PaymentAttemptItem"("paymentAttemptId", "bookId");
CREATE INDEX "PaymentAttemptItem_bookId_idx" ON "PaymentAttemptItem"("bookId");
CREATE INDEX "StripeWebhookEvent_paymentAttemptId_idx" ON "StripeWebhookEvent"("paymentAttemptId");

ALTER TABLE "PaymentAttempt"
  ADD CONSTRAINT "PaymentAttempt_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentAttempt"
  ADD CONSTRAINT "PaymentAttempt_cartId_fkey"
  FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentAttemptItem"
  ADD CONSTRAINT "PaymentAttemptItem_paymentAttemptId_fkey"
  FOREIGN KEY ("paymentAttemptId") REFERENCES "PaymentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentAttemptItem"
  ADD CONSTRAINT "PaymentAttemptItem_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StripeWebhookEvent"
  ADD CONSTRAINT "StripeWebhookEvent_paymentAttemptId_fkey"
  FOREIGN KEY ("paymentAttemptId") REFERENCES "PaymentAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

