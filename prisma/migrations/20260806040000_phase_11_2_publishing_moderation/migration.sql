CREATE TYPE "PublishingAuditAction" AS ENUM ('SUBMITTED_FOR_REVIEW', 'PUBLISHED', 'CHANGES_REQUESTED', 'ARCHIVED');

ALTER TABLE "Book"
ADD COLUMN "submittedAt" TIMESTAMP(3),
ADD COLUMN "reviewedAt" TIMESTAMP(3);

CREATE TABLE "PublishingAuditLog" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "PublishingAuditAction" NOT NULL,
    "fromStatus" "BookStatus" NOT NULL,
    "toStatus" "BookStatus" NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublishingAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PublishingAuditLog_bookId_createdAt_idx" ON "PublishingAuditLog"("bookId", "createdAt");
CREATE INDEX "PublishingAuditLog_actorId_createdAt_idx" ON "PublishingAuditLog"("actorId", "createdAt");
CREATE INDEX "PublishingAuditLog_action_createdAt_idx" ON "PublishingAuditLog"("action", "createdAt");

ALTER TABLE "PublishingAuditLog" ADD CONSTRAINT "PublishingAuditLog_bookId_fkey"
FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PublishingAuditLog" ADD CONSTRAINT "PublishingAuditLog_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
