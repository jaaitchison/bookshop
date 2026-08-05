CREATE TYPE "BookFileFormat" AS ENUM ('PDF', 'EPUB');

ALTER TABLE "BookFile"
  ADD COLUMN "format" "BookFileFormat" NOT NULL DEFAULT 'PDF',
  ADD COLUMN "originalName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "contentType" TEXT NOT NULL DEFAULT 'application/octet-stream',
  ADD COLUMN "sizeBytes" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "BookFile"
  ALTER COLUMN "format" DROP DEFAULT,
  ALTER COLUMN "originalName" DROP DEFAULT,
  ALTER COLUMN "contentType" DROP DEFAULT,
  ALTER COLUMN "sizeBytes" DROP DEFAULT;

CREATE UNIQUE INDEX "BookFile_bookId_fileType_key" ON "BookFile"("bookId", "fileType");
