-- CreateTable
CREATE TABLE "ChapterRevision" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPreview" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChapterRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChapterRevision_chapterId_createdAt_idx" ON "ChapterRevision"("chapterId", "createdAt");

-- CreateIndex
CREATE INDEX "ChapterRevision_userId_idx" ON "ChapterRevision"("userId");

-- AddForeignKey
ALTER TABLE "ChapterRevision" ADD CONSTRAINT "ChapterRevision_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterRevision" ADD CONSTRAINT "ChapterRevision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
