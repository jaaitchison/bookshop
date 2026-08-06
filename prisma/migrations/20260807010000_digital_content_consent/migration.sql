ALTER TABLE "PaymentAttempt"
ADD COLUMN "digitalContentConsentAt" TIMESTAMP(3),
ADD COLUMN "termsVersion" TEXT NOT NULL DEFAULT '',
ADD COLUMN "refundPolicyVersion" TEXT NOT NULL DEFAULT '';
