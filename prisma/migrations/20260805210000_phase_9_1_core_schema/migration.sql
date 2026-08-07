-- Extend the publishing workflow without changing existing ownership semantics.
ALTER TYPE "BookStatus" ADD VALUE 'IN_REVIEW';
ALTER TYPE "BookStatus" ADD VALUE 'CHANGES_REQUESTED';
ALTER TYPE "BookStatus" ADD VALUE 'APPROVED';

CREATE TYPE "BookVisibility" AS ENUM ('PRIVATE', 'PUBLIC');
CREATE TYPE "BookFileType" AS ENUM ('MANUSCRIPT', 'SAMPLE');

ALTER TABLE "Book"
  ADD COLUMN "subtitle" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "visibility" "BookVisibility" NOT NULL DEFAULT 'PRIVATE';

-- Existing published catalogue entries must remain visible after the migration.
UPDATE "Book" SET "visibility" = 'PUBLIC' WHERE "status" = 'PUBLISHED';

CREATE TABLE "BookEdition" (
  "id" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT 'First edition',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BookEdition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookFile" (
  "id" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "editionId" TEXT,
  "storageKey" TEXT NOT NULL DEFAULT '',
  "fileUrl" TEXT NOT NULL,
  "fileType" "BookFileType" NOT NULL,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BookFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookCover" (
  "id" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "ratio" TEXT NOT NULL DEFAULT '2:3',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BookCover_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Cart" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CartItem" (
  "id" TEXT NOT NULL,
  "cartId" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LibraryItem" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "orderItemId" TEXT,
  "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LibraryItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Book_visibility_idx" ON "Book"("visibility");
CREATE INDEX "BookEdition_bookId_idx" ON "BookEdition"("bookId");
CREATE INDEX "BookFile_bookId_idx" ON "BookFile"("bookId");
CREATE INDEX "BookFile_editionId_idx" ON "BookFile"("editionId");
CREATE INDEX "BookFile_fileType_isPublic_idx" ON "BookFile"("fileType", "isPublic");
CREATE UNIQUE INDEX "BookCover_bookId_key" ON "BookCover"("bookId");
CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");
CREATE UNIQUE INDEX "CartItem_cartId_bookId_key" ON "CartItem"("cartId", "bookId");
CREATE INDEX "CartItem_bookId_idx" ON "CartItem"("bookId");
CREATE UNIQUE INDEX "LibraryItem_userId_bookId_key" ON "LibraryItem"("userId", "bookId");
CREATE INDEX "LibraryItem_bookId_idx" ON "LibraryItem"("bookId");
CREATE INDEX "LibraryItem_orderItemId_idx" ON "LibraryItem"("orderItemId");

ALTER TABLE "BookEdition"
  ADD CONSTRAINT "BookEdition_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BookFile"
  ADD CONSTRAINT "BookFile_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BookFile"
  ADD CONSTRAINT "BookFile_editionId_fkey"
  FOREIGN KEY ("editionId") REFERENCES "BookEdition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BookCover"
  ADD CONSTRAINT "BookCover_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Cart"
  ADD CONSTRAINT "Cart_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CartItem"
  ADD CONSTRAINT "CartItem_cartId_fkey"
  FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CartItem"
  ADD CONSTRAINT "CartItem_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LibraryItem"
  ADD CONSTRAINT "LibraryItem_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LibraryItem"
  ADD CONSTRAINT "LibraryItem_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LibraryItem"
  ADD CONSTRAINT "LibraryItem_orderItemId_fkey"
  FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
