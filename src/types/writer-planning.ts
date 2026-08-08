export type WriterPlanningKind = 'outline' | 'scene' | 'character' | 'research';

export interface WriterPlanningItem {
  id: string;
  bookId: string;
  kind: WriterPlanningKind;
  title: string;
  summary: string;
  details: string;
  label: string;
  sourceUrl: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export type WriterPlanningWorkspace = Record<WriterPlanningKind, WriterPlanningItem[]>;
