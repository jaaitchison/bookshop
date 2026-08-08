CREATE TYPE "BookCollaboratorPermission" AS ENUM ('COMMENTER', 'EDITOR');
CREATE TYPE "EditorialCommentStatus" AS ENUM ('OPEN', 'RESOLVED');

CREATE TABLE "BookCollaborator" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "permission" "BookCollaboratorPermission" NOT NULL DEFAULT 'COMMENTER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BookCollaborator_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EditorialComment" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapterId" TEXT,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "anchorText" TEXT NOT NULL DEFAULT '',
    "status" "EditorialCommentStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EditorialComment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookCollaborator_bookId_userId_key" ON "BookCollaborator"("bookId", "userId");
CREATE INDEX "BookCollaborator_userId_idx" ON "BookCollaborator"("userId");
CREATE INDEX "EditorialComment_bookId_status_createdAt_idx" ON "EditorialComment"("bookId", "status", "createdAt");
CREATE INDEX "EditorialComment_chapterId_createdAt_idx" ON "EditorialComment"("chapterId", "createdAt");
CREATE INDEX "EditorialComment_authorId_idx" ON "EditorialComment"("authorId");

ALTER TABLE "BookCollaborator" ADD CONSTRAINT "BookCollaborator_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookCollaborator" ADD CONSTRAINT "BookCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookCollaborator" ADD CONSTRAINT "BookCollaborator_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EditorialComment" ADD CONSTRAINT "EditorialComment_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EditorialComment" ADD CONSTRAINT "EditorialComment_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EditorialComment" ADD CONSTRAINT "EditorialComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EditorialComment" ADD CONSTRAINT "EditorialComment_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
