export type EditorialPermission = 'commenter' | 'editor';
export type EditorialCommentStatusValue = 'open' | 'resolved';

export interface EditorialCollaborator {
  id: string;
  userId: string;
  name: string;
  email: string;
  permission: EditorialPermission;
  createdAt: string;
}

export interface EditorialCommentRecord {
  id: string;
  bookId: string;
  chapterId: string | null;
  chapterTitle: string | null;
  authorId: string;
  authorName: string;
  body: string;
  anchorText: string;
  status: EditorialCommentStatusValue;
  resolvedAt: string | null;
  resolvedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EditorialAccess {
  canManage: boolean;
  permission: 'owner' | EditorialPermission;
  userId: string;
}

export interface EditorialBook {
  id: string;
  title: string;
  description: string;
  genre: string;
  coverUrl: string;
  price: number;
  status: 'draft' | 'in_review' | 'changes_requested' | 'approved' | 'published' | 'archived';
}

export interface EditorialChapter {
  id: string;
  bookId: string;
  title: string;
  content: string;
  chapterNo: number;
  isPreview: boolean;
  version: number;
}

export interface EditorialWorkspaceState {
  book: EditorialBook;
  chapters: EditorialChapter[];
  collaborators: EditorialCollaborator[];
  comments: EditorialCommentRecord[];
  access: EditorialAccess;
}

export interface EditorialAssignment {
  id: string;
  bookId: string;
  title: string;
  authorDisplayName: string;
  permission: EditorialPermission;
  openComments: number;
  updatedAt: string;
}
