export type PublishingReviewAction = 'publish' | 'request_changes' | 'archive';

export type PublishingReviewItem = {
  id: string;
  slug: string;
  title: string;
  author: string;
  authorEmail: string;
  genre: string;
  description: string;
  price: number;
  coverUrl: string;
  submittedAt: string;
  updatedAt: string;
  chapterCount: number;
  files: Array<{
    id: string;
    fileType: 'MANUSCRIPT' | 'SAMPLE';
    format: 'PDF' | 'EPUB';
    originalName: string;
  }>;
};

export type PublishingAuditEntry = {
  id: string;
  bookId: string;
  bookTitle: string;
  actor: string;
  action: 'SUBMITTED_FOR_REVIEW' | 'PUBLISHED' | 'CHANGES_REQUESTED' | 'ARCHIVED';
  fromStatus: string;
  toStatus: string;
  reason: string;
  createdAt: string;
};

export type PublishingDashboard = {
  queue: PublishingReviewItem[];
  recentActivity: PublishingAuditEntry[];
};
