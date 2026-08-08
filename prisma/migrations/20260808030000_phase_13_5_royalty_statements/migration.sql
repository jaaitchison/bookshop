CREATE TYPE "RoyaltyStatementStatus" AS ENUM ('ISSUED', 'PAID', 'VOID');
CREATE TYPE "WriterPayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED');

ALTER TABLE "Book" ADD COLUMN "royaltyRate" DECIMAL(5,4) NOT NULL DEFAULT 0.7000;

CREATE TABLE "WriterRoyaltyStatement" (
    "id" TEXT NOT NULL,
    "writerId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "grossRevenue" DECIMAL(12,2) NOT NULL,
    "royaltyAmount" DECIMAL(12,2) NOT NULL,
    "status" "RoyaltyStatementStatus" NOT NULL DEFAULT 'ISSUED',
    "issuedById" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WriterRoyaltyStatement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WriterRoyaltyStatementLine" (
    "id" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "bookId" TEXT,
    "bookTitle" TEXT NOT NULL,
    "unitsSold" INTEGER NOT NULL,
    "grossRevenue" DECIMAL(12,2) NOT NULL,
    "royaltyRate" DECIMAL(5,4) NOT NULL,
    "royaltyAmount" DECIMAL(12,2) NOT NULL,
    "orderItemIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WriterRoyaltyStatementLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WriterPayout" (
    "id" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "status" "WriterPayoutStatus" NOT NULL DEFAULT 'PENDING',
    "method" TEXT NOT NULL DEFAULT '',
    "reference" TEXT NOT NULL DEFAULT '',
    "failureNote" TEXT NOT NULL DEFAULT '',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WriterPayout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WriterRoyaltyStatement_writerId_periodStart_periodEnd_key" ON "WriterRoyaltyStatement"("writerId", "periodStart", "periodEnd");
CREATE INDEX "WriterRoyaltyStatement_writerId_issuedAt_idx" ON "WriterRoyaltyStatement"("writerId", "issuedAt");
CREATE INDEX "WriterRoyaltyStatement_status_issuedAt_idx" ON "WriterRoyaltyStatement"("status", "issuedAt");
CREATE INDEX "WriterRoyaltyStatementLine_statementId_idx" ON "WriterRoyaltyStatementLine"("statementId");
CREATE INDEX "WriterRoyaltyStatementLine_bookId_idx" ON "WriterRoyaltyStatementLine"("bookId");
CREATE UNIQUE INDEX "WriterPayout_statementId_key" ON "WriterPayout"("statementId");
CREATE INDEX "WriterPayout_status_createdAt_idx" ON "WriterPayout"("status", "createdAt");

ALTER TABLE "WriterRoyaltyStatement" ADD CONSTRAINT "WriterRoyaltyStatement_writerId_fkey" FOREIGN KEY ("writerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WriterRoyaltyStatement" ADD CONSTRAINT "WriterRoyaltyStatement_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WriterRoyaltyStatementLine" ADD CONSTRAINT "WriterRoyaltyStatementLine_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "WriterRoyaltyStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WriterRoyaltyStatementLine" ADD CONSTRAINT "WriterRoyaltyStatementLine_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WriterPayout" ADD CONSTRAINT "WriterPayout_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "WriterRoyaltyStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
