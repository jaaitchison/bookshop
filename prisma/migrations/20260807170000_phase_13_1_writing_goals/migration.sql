CREATE TABLE "WritingGoal" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "targetWordCount" INTEGER NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WritingGoal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WritingGoal_bookId_key" ON "WritingGoal"("bookId");
CREATE INDEX "WritingGoal_deadline_idx" ON "WritingGoal"("deadline");

ALTER TABLE "WritingGoal"
ADD CONSTRAINT "WritingGoal_bookId_fkey"
FOREIGN KEY ("bookId") REFERENCES "Book"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
