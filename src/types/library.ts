export type ReaderLibraryFile = {
  id: string;
  fileType: "MANUSCRIPT" | "SAMPLE";
  format: "PDF" | "EPUB";
  originalName: string;
  fileUrl: string;
  sizeBytes: number;
};

export type ReaderFileDetail = ReaderLibraryFile & {
  progress: number | null;
  book: {
    id: string;
    slug: string;
    title: string;
    author: string;
  };
};

export type ReaderLibraryItem = {
  id: string;
  acquiredAt: string;
  progress: number | null;
  book: {
    id: string;
    slug: string;
    title: string;
    author: string;
    cover: string;
  };
  files: ReaderLibraryFile[];
};
