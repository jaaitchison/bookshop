CREATE TYPE "BookPlanningKind" AS ENUM ('OUTLINE', 'SCENE', 'CHARACTER', 'RESEARCH');

CREATE TABLE "BookPlanningItem" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "kind" "BookPlanningKind" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "details" TEXT NOT NULL DEFAULT '',
    "label" TEXT NOT NULL DEFAULT '',
    "sourceUrl" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookPlanningItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookPlanningItem_bookId_kind_position_key"
ON "BookPlanningItem"("bookId", "kind", "position");

CREATE INDEX "BookPlanningItem_bookId_kind_idx"
ON "BookPlanningItem"("bookId", "kind");

ALTER TABLE "BookPlanningItem"
ADD CONSTRAINT "BookPlanningItem_bookId_fkey"
FOREIGN KEY ("bookId") REFERENCES "Book"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
