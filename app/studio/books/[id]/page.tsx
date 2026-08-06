"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  resolveWriterSaveState,
  writerSaveStateLabel,
} from "@/src/lib/writer-save-state";
import {
  getTextStatistics,
} from "@/src/lib/writer-text-statistics";
import {
  applyMarkdownLinePrefix,
  applyMarkdownWrap,
  parseMarkdownBlocks,
  stripInlineMarkdown,
} from "@/src/lib/writer-markdown";

type StudioBook = {
  id: string;
  title: string;
  description: string;
  genre: string;
  coverUrl: string;
  price: number;
  status: "draft" | "in_review" | "changes_requested" | "approved" | "published" | "archived";
  moderationReason?: string;
};

type Chapter = {
  id: string;
  bookId: string;
  title: string;
  content: string;
  chapterNo: number;
  isPreview: boolean;
  version: number;
};

type ChapterRevision = {
  id: string;
  chapterId: string;
  userId: string;
  title: string;
  content: string;
  isPreview: boolean;
  createdAt: string;
};
type StudioBookFile = {
  id: string;
  fileType: "MANUSCRIPT" | "SAMPLE";
  format: "PDF" | "EPUB";
  originalName: string;
  sizeBytes: number;
  isPublic: boolean;
  fileUrl: string;
  updatedAt: string;
};
type BookEditableSnapshot = {
  title: string;
  description: string;
  genre: string;
  coverUrl: string;
  price: number;
};

type ChapterEditableSnapshot = {
  title: string;
  content: string;
  isPreview: boolean;
};

function snapshotBook(book: StudioBook): BookEditableSnapshot {
  return {
    title: book.title,
    description: book.description,
    genre: book.genre,
    coverUrl: book.coverUrl,
    price: Number(book.price),
  };
}

function snapshotChapter(
  chapter: Chapter,
): ChapterEditableSnapshot {
  return {
    title: chapter.title,
    content: chapter.content,
    isPreview: chapter.isPreview,
  };
}

function sameBookSnapshot(
  left: BookEditableSnapshot,
  right: BookEditableSnapshot,
): boolean {
  return (
    left.title === right.title &&
    left.description === right.description &&
    left.genre === right.genre &&
    left.coverUrl === right.coverUrl &&
    left.price === right.price
  );
}

function sameChapterSnapshot(
  left: ChapterEditableSnapshot,
  right: ChapterEditableSnapshot,
): boolean {
  return (
    left.title === right.title &&
    left.content === right.content &&
    left.isPreview === right.isPreview
  );
}

export default function WriterBookEditorPage() {
  const params = useParams<{ id: string }>();
  const bookId = params.id;

  const [book, setBook] = useState<StudioBook | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [bookError, setBookError] = useState<string | null>(null);
  const [chapterError, setChapterError] = useState<string | null>(null);
  const [bookSaving, setBookSaving] = useState(false);
  const [chapterSaving, setChapterSaving] = useState(false);
  const [chapterConflict, setChapterConflict] = useState(false);
  const [chapterPreviewOpen, setChapterPreviewOpen] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [bookFiles, setBookFiles] = useState<StudioBookFile[]>([]);
  const [bookFileUploading, setBookFileUploading] = useState<StudioBookFile["fileType"] | null>(null);
  const [bookFileError, setBookFileError] = useState<string | null>(null);
  const [revisionHistoryOpen, setRevisionHistoryOpen] = useState(false);
  const [chapterRevisions, setChapterRevisions] = useState<ChapterRevision[]>([]);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [revisionLoading, setRevisionLoading] = useState(false);
  const [revisionRestoring, setRevisionRestoring] = useState(false);
  const [revisionError, setRevisionError] = useState<string | null>(null);
  const [bookBaseline, setBookBaseline] =
    useState<BookEditableSnapshot | null>(null);
  const [chapterBaselines, setChapterBaselines] =
    useState<Record<string, ChapterEditableSnapshot>>({});
  const chapterAutosaveTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const chapterSaveRequestRef = useRef(0);
  const bookAutosaveTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);
  const bookSaveRequestRef = useRef(0);
  const chapterContentRef = useRef<HTMLTextAreaElement | null>(null);

  const selectedChapter = useMemo(
    () => chapters.find((chapter) => chapter.id === selectedChapterId) ?? null,
    [chapters, selectedChapterId],
  );
  const selectedRevision = useMemo(
    () => chapterRevisions.find((revision) => revision.id === selectedRevisionId) ?? null,
    [chapterRevisions, selectedRevisionId],
  );
  const manuscriptFile = bookFiles.find((file) => file.fileType === "MANUSCRIPT") ?? null;
  const sampleFile = bookFiles.find((file) => file.fileType === "SAMPLE") ?? null;

  useEffect(() => {
    let active = true;

    const loadBookFiles = async () => {
      try {
        const response = await fetch(`/api/studio/books/${bookId}/manuscript`, {
          credentials: "include",
          cache: "no-store",
        });
        const payload = (await response.json()) as { files?: StudioBookFile[]; error?: string };
        if (!active) return;
        if (!response.ok || !payload.files) {
          setBookFileError(payload.error ?? "Unable to load book files.");
          return;
        }
        setBookFiles(payload.files);
      } catch {
        if (active) setBookFileError("Unable to load book files.");
      }
    };

    void loadBookFiles();
    return () => {
      active = false;
    };
  }, [bookId]);

  const loadRevisionHistory = useCallback(async (chapterId: string) => {
    setRevisionLoading(true);
    setRevisionError(null);

    try {
      const response = await fetch(
        `/api/studio/books/${bookId}/chapters/${chapterId}/revisions`,
        { credentials: "include", cache: "no-store" },
      );
      const payload = (await response.json()) as {
        revisions?: ChapterRevision[];
        error?: string;
      };

      if (!response.ok || !payload.revisions) {
        setRevisionError(payload.error ?? "Unable to load revision history.");
        return;
      }

      setChapterRevisions(payload.revisions);
      setSelectedRevisionId((current) =>
        payload.revisions!.some((revision) => revision.id === current)
          ? current
          : payload.revisions![0]?.id ?? null,
      );
    } catch {
      setRevisionError("Unable to load revision history.");
    } finally {
      setRevisionLoading(false);
    }
  }, [bookId]);

  const resetRevisionHistory = () => {
    setRevisionHistoryOpen(false);
    setChapterRevisions([]);
    setSelectedRevisionId(null);
    setRevisionError(null);
    setChapterConflict(false);
  };
  const selectedChapterStatistics = useMemo(
    () =>
      getTextStatistics(
        selectedChapter?.content ?? "",
      ),
    [selectedChapter?.content],
  );

  const manuscriptStatistics = useMemo(() => {
    const combinedContent = chapters
      .map((chapter) => chapter.content)
      .join("\n\n");

    return {
      ...getTextStatistics(combinedContent),
      chapters: chapters.length,
    };
  }, [chapters]);
  const selectedChapterPreviewBlocks = useMemo(
    () =>
      parseMarkdownBlocks(
        selectedChapter?.content ?? "",
      ),
    [selectedChapter?.content],
  );

  const updateSelectedChapterContent = (
    nextContent: string,
  ) => {
    if (!selectedChapter) {
      return;
    }

    setChapters((current) =>
      current.map((chapter) =>
        chapter.id === selectedChapter.id
          ? {
              ...chapter,
              content: nextContent,
            }
          : chapter,
      ),
    );
  };

  const applyInlineMarkdown = (
    before: string,
    after = before,
  ) => {
    if (!selectedChapter || !chapterContentRef.current) {
      return;
    }

    const textarea = chapterContentRef.current;
    const result = applyMarkdownWrap(
      selectedChapter.content,
      textarea.selectionStart,
      textarea.selectionEnd,
      before,
      after,
    );

    updateSelectedChapterContent(result.value);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(
        result.selectionStart,
        result.selectionEnd,
      );
    });
  };

  const applyLineMarkdown = (
    prefix: string,
  ) => {
    if (!selectedChapter || !chapterContentRef.current) {
      return;
    }

    const textarea = chapterContentRef.current;
    const result = applyMarkdownLinePrefix(
      selectedChapter.content,
      textarea.selectionStart,
      textarea.selectionEnd,
      prefix,
    );

    updateSelectedChapterContent(result.value);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(
        result.selectionStart,
        result.selectionEnd,
      );
    });
  };
  const bookIsDirty = useMemo(() => {
    if (!book || !bookBaseline) {
      return false;
    }

    return !sameBookSnapshot(
      snapshotBook(book),
      bookBaseline,
    );
  }, [book, bookBaseline]);

  const selectedChapterIsDirty = useMemo(() => {
    if (!selectedChapter) {
      return false;
    }

    const baseline =
      chapterBaselines[selectedChapter.id];

    if (!baseline) {
      return false;
    }

    return !sameChapterSnapshot(
      snapshotChapter(selectedChapter),
      baseline,
    );
  }, [selectedChapter, chapterBaselines]);

  const bookSaveState = resolveWriterSaveState({
    isDirty: bookIsDirty,
    isSaving: bookSaving,
    hasError: Boolean(bookError),
  });

  const chapterSaveState = resolveWriterSaveState({
    isDirty: selectedChapterIsDirty,
    isSaving: chapterSaving,
    hasError: Boolean(chapterError),
  });
  const hasUnsavedChanges =
    bookIsDirty || selectedChapterIsDirty;

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (
      event: BeforeUnloadEvent,
    ) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload,
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload,
      );
    };
  }, [hasUnsavedChanges]);

  const confirmUnsavedChanges = (
    message: string,
  ): boolean => {
    if (!hasUnsavedChanges) {
      return true;
    }

    return window.confirm(message);
  };

  const selectChapterSafely = (
    nextChapterId: string,
  ) => {
    if (nextChapterId === selectedChapterId) {
      return;
    }

    if (
      selectedChapterIsDirty &&
      !window.confirm(
        "This chapter has unsaved changes. Switch chapters and discard those changes?",
      )
    ) {
      return;
    }

    resetRevisionHistory();
    setSelectedChapterId(nextChapterId);
  };

  useEffect(() => {
    let active = true;

    const loadEditor = async () => {
      try {
        const [booksResponse, chaptersResponse] = await Promise.all([
          fetch("/api/studio/books", {
            credentials: "include",
            cache: "no-store",
          }),
          fetch(`/api/studio/books/${bookId}/chapters`, {
            credentials: "include",
            cache: "no-store",
          }),
        ]);

        if (!booksResponse.ok || !chaptersResponse.ok) {
          throw new Error("Unable to load this book.");
        }

        const booksPayload = (await booksResponse.json()) as {
          books?: StudioBook[];
        };
        const chaptersPayload = (await chaptersResponse.json()) as {
          chapters?: Chapter[];
        };

        const ownedBook =
          (booksPayload.books ?? []).find(
            (candidate) => candidate.id === bookId,
          ) ?? null;

        if (!ownedBook) {
          throw new Error(
            "This book is not available in your Writer Studio.",
          );
        }

        const nextChapters = chaptersPayload.chapters ?? [];

        if (!active) {
          return;
        }

        setBook(ownedBook);
        setBookBaseline(snapshotBook(ownedBook));
        setChapters(nextChapters);
        setChapterBaselines(
          Object.fromEntries(
            nextChapters.map((chapter) => [
              chapter.id,
              snapshotChapter(chapter),
            ]),
          ),
        );
        setSelectedChapterId(nextChapters[0]?.id ?? null);
      } catch (error) {
        if (!active) {
          return;
        }

        setBookError(
          error instanceof Error
            ? error.message
            : "Unable to load this book.",
        );
      }
    };

    void loadEditor();

    return () => {
      active = false;
    };
  }, [bookId]);

  const persistBook = useCallback(async (
    bookToSave: StudioBook,
  ): Promise<boolean> => {
    const requestId = bookSaveRequestRef.current + 1;
    bookSaveRequestRef.current = requestId;

    setBookSaving(true);
    setBookError(null);

    try {
      const response = await fetch(`/api/books/${bookToSave.id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: bookToSave.title,
          description: bookToSave.description,
          genre: bookToSave.genre,
          cover: bookToSave.coverUrl,
          price: Number(bookToSave.price),
        }),
      });

      const payload = (await response.json()) as StudioBook & {
        error?: string;
      };

      if (requestId !== bookSaveRequestRef.current) {
        return false;
      }

      if (!response.ok) {
        setBookError(
          payload.error ?? "Unable to save book metadata.",
        );
        return false;
      }

      const savedBook = {
        ...bookToSave,
        ...payload,
      };

      setBook(savedBook);
      setBookBaseline(snapshotBook(savedBook));

      return true;
    } catch {
      if (requestId === bookSaveRequestRef.current) {
        setBookError("Unable to save book metadata.");
      }

      return false;
    } finally {
      if (requestId === bookSaveRequestRef.current) {
        setBookSaving(false);
      }
    }
  }, []);

  const saveBook = async (event: FormEvent) => {
    event.preventDefault();

    if (!book) {
      return;
    }

    if (bookAutosaveTimerRef.current) {
      clearTimeout(bookAutosaveTimerRef.current);
      bookAutosaveTimerRef.current = null;
    }

    await persistBook(book);
  };

  const applyPersistedCover = (coverUrl: string) => {
    setBook((current) => current ? { ...current, coverUrl } : current);
    setBookBaseline((current) => current ? { ...current, coverUrl } : current);
  };

  const uploadCover = async (file: File) => {
    if (!book) return;

    if (bookAutosaveTimerRef.current) {
      clearTimeout(bookAutosaveTimerRef.current);
      bookAutosaveTimerRef.current = null;
    }

    bookSaveRequestRef.current += 1;
    setCoverUploading(true);
    setCoverError(null);

    try {
      const formData = new FormData();
      formData.set("cover", file);

      const response = await fetch(`/api/studio/books/${book.id}/cover`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const payload = (await response.json()) as { coverUrl?: string; error?: string };

      if (!response.ok || typeof payload.coverUrl !== "string") {
        setCoverError(payload.error ?? "Unable to upload cover image.");
        return;
      }

      applyPersistedCover(payload.coverUrl);
    } catch {
      setCoverError("Unable to upload cover image.");
    } finally {
      setCoverUploading(false);
    }
  };

  const removeCover = async () => {
    if (!book || !book.coverUrl) return;

    if (bookAutosaveTimerRef.current) {
      clearTimeout(bookAutosaveTimerRef.current);
      bookAutosaveTimerRef.current = null;
    }

    bookSaveRequestRef.current += 1;
    setCoverUploading(true);
    setCoverError(null);

    try {
      const response = await fetch(`/api/studio/books/${book.id}/cover`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await response.json()) as { coverUrl?: string; error?: string };

      if (!response.ok || payload.coverUrl !== "") {
        setCoverError(payload.error ?? "Unable to remove cover image.");
        return;
      }

      applyPersistedCover("");
    } catch {
      setCoverError("Unable to remove cover image.");
    } finally {
      setCoverUploading(false);
    }
  };

  const uploadBookFile = async (fileType: StudioBookFile["fileType"], file: File) => {
    setBookFileUploading(fileType);
    setBookFileError(null);
    try {
      const formData = new FormData();
      formData.set("fileType", fileType);
      formData.set("file", file);
      const response = await fetch(`/api/studio/books/${bookId}/manuscript`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const payload = (await response.json()) as { file?: StudioBookFile; error?: string };
      if (!response.ok || !payload.file) {
        setBookFileError(payload.error ?? "Unable to upload book file.");
        return;
      }
      setBookFiles((current) => [
        ...current.filter((entry) => entry.fileType !== fileType),
        payload.file!,
      ]);
    } catch {
      setBookFileError("Unable to upload book file.");
    } finally {
      setBookFileUploading(null);
    }
  };

  const removeBookFile = async (fileType: StudioBookFile["fileType"]) => {
    setBookFileUploading(fileType);
    setBookFileError(null);
    try {
      const response = await fetch(
        `/api/studio/books/${bookId}/manuscript?fileType=${fileType}`,
        { method: "DELETE", credentials: "include" },
      );
      const payload = (await response.json()) as { removed?: boolean; error?: string };
      if (!response.ok || !payload.removed) {
        setBookFileError(payload.error ?? "Unable to remove book file.");
        return;
      }
      setBookFiles((current) => current.filter((entry) => entry.fileType !== fileType));
    } catch {
      setBookFileError("Unable to remove book file.");
    } finally {
      setBookFileUploading(null);
    }
  };

  useEffect(() => {
    if (
      !book ||
      !bookIsDirty ||
      bookSaving ||
      bookError
    ) {
      return;
    }

    bookAutosaveTimerRef.current = setTimeout(() => {
      bookAutosaveTimerRef.current = null;
      void persistBook(book);
    }, 1200);

    return () => {
      if (bookAutosaveTimerRef.current) {
        clearTimeout(bookAutosaveTimerRef.current);
        bookAutosaveTimerRef.current = null;
      }
    };
  }, [
    book,
    bookIsDirty,
    bookSaving,
    bookError,
    persistBook,
  ]);
  const changeStatus = async (
    status: StudioBook["status"],
  ) => {
    if (!book) return;

    setBookError(null);

    try {
      const response = await fetch(`/api/books/${book.id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const payload = (await response.json()) as StudioBook & {
        error?: string;
      };

      if (!response.ok) {
        setBookError(payload.error ?? "Unable to change publishing status.");
        return;
      }

      setBook((current) =>
        current
          ? {
              ...current,
              status: payload.status,
            }
          : current,
      );
    } catch {
      setBookError("Unable to change publishing status.");
    }
  };

  const addChapter = async () => {
    if (!book) return;

    setChapterError(null);

    try {
      const response = await fetch(`/api/studio/books/${book.id}/chapters`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: `Chapter ${chapters.length + 1}`,
          content: "",
          isPreview: false,
        }),
      });

      const payload = (await response.json()) as {
        chapter?: Chapter;
        error?: string;
      };

      if (!response.ok || !payload.chapter) {
        setChapterError(payload.error ?? "Unable to create chapter.");
        return;
      }

      setChapters((current) => [...current, payload.chapter!]);
      setChapterBaselines((current) => ({
        ...current,
        [payload.chapter!.id]: snapshotChapter(payload.chapter!),
      }));
      resetRevisionHistory();
      setSelectedChapterId(payload.chapter.id);
    } catch {
      setChapterError("Unable to create chapter.");
    }
  };

  const persistChapter = useCallback(async (
    chapter: Chapter,
  ): Promise<boolean> => {
    if (!book) {
      return false;
    }

    const requestId = chapterSaveRequestRef.current + 1;
    chapterSaveRequestRef.current = requestId;

    setChapterSaving(true);
    setChapterError(null);
    setChapterConflict(false);

    try {
      const response = await fetch(
        `/api/studio/books/${book.id}/chapters/${chapter.id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: chapter.title,
            content: chapter.content,
            isPreview: chapter.isPreview,
            version: chapter.version,
          }),
        },
      );

      const payload = (await response.json()) as {
        chapter?: Chapter;
        error?: string;
        conflict?: boolean;
      };

      if (requestId !== chapterSaveRequestRef.current) {
        return false;
      }

      if (!response.ok || !payload.chapter) {
        if (response.status === 409 && payload.conflict) {
          setChapterConflict(true);
        }
        setChapterError(
          payload.error ?? "Unable to save chapter.",
        );
        return false;
      }

      setChapters((current) =>
        current.map((currentChapter) =>
          currentChapter.id === payload.chapter!.id
            ? payload.chapter!
            : currentChapter,
        ),
      );

      setChapterBaselines((current) => ({
        ...current,
        [payload.chapter!.id]: snapshotChapter(
          payload.chapter!,
        ),
      }));

      if (revisionHistoryOpen) {
        void loadRevisionHistory(payload.chapter.id);
      }

      return true;
    } catch {
      if (requestId === chapterSaveRequestRef.current) {
        setChapterError("Unable to save chapter.");
      }

      return false;
    } finally {
      if (requestId === chapterSaveRequestRef.current) {
        setChapterSaving(false);
      }
    }
  }, [book, loadRevisionHistory, revisionHistoryOpen]);

  const saveChapter = async () => {
    if (!selectedChapter) {
      return;
    }

    if (chapterAutosaveTimerRef.current) {
      clearTimeout(chapterAutosaveTimerRef.current);
      chapterAutosaveTimerRef.current = null;
    }

    await persistChapter(selectedChapter);
  };

  const toggleRevisionHistory = () => {
    if (!selectedChapter) return;

    const nextOpen = !revisionHistoryOpen;
    setRevisionHistoryOpen(nextOpen);
    if (nextOpen) void loadRevisionHistory(selectedChapter.id);
  };

  const restoreRevision = async () => {
    if (!selectedChapter || !selectedRevision) return;

    if (
      selectedChapterIsDirty &&
      !window.confirm(
        "This chapter has unsaved changes. Restore the selected revision and discard those edits?",
      )
    ) {
      return;
    }

    if (chapterAutosaveTimerRef.current) {
      clearTimeout(chapterAutosaveTimerRef.current);
      chapterAutosaveTimerRef.current = null;
    }

    chapterSaveRequestRef.current += 1;
    setRevisionRestoring(true);
    setRevisionError(null);
    setChapterError(null);

    try {
      const response = await fetch(
        `/api/studio/books/${bookId}/chapters/${selectedChapter.id}/revisions`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            revisionId: selectedRevision.id,
            version: selectedChapter.version,
          }),
        },
      );
      const payload = (await response.json()) as {
        chapter?: Chapter;
        error?: string;
        conflict?: boolean;
      };

      if (!response.ok || !payload.chapter) {
        if (response.status === 409 && payload.conflict) {
          setChapterConflict(true);
          setChapterError(payload.error ?? "A newer chapter version is available.");
        }
        setRevisionError(payload.error ?? "Unable to restore revision.");
        return;
      }

      setChapters((current) =>
        current.map((chapter) =>
          chapter.id === payload.chapter!.id ? payload.chapter! : chapter,
        ),
      );
      setChapterBaselines((current) => ({
        ...current,
        [payload.chapter!.id]: snapshotChapter(payload.chapter!),
      }));
      setChapterConflict(false);
      await loadRevisionHistory(payload.chapter.id);
    } catch {
      setRevisionError("Unable to restore revision.");
    } finally {
      setRevisionRestoring(false);
    }
  };

  const reloadChapterAfterConflict = async () => {
    if (!selectedChapter) return;

    if (
      selectedChapterIsDirty &&
      !window.confirm("Reload the latest saved chapter and discard your local edits?")
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/studio/books/${bookId}/chapters`, {
        credentials: "include",
        cache: "no-store",
      });
      const payload = (await response.json()) as { chapters?: Chapter[]; error?: string };
      const latest = payload.chapters?.find((chapter) => chapter.id === selectedChapter.id);

      if (!response.ok || !latest) {
        setChapterError(payload.error ?? "Unable to reload the latest chapter.");
        return;
      }

      setChapters((current) =>
        current.map((chapter) => chapter.id === latest.id ? latest : chapter),
      );
      setChapterBaselines((current) => ({
        ...current,
        [latest.id]: snapshotChapter(latest),
      }));
      setChapterConflict(false);
      setChapterError(null);
      if (revisionHistoryOpen) void loadRevisionHistory(latest.id);
    } catch {
      setChapterError("Unable to reload the latest chapter.");
    }
  };

  useEffect(() => {
    if (
      !selectedChapter ||
      !selectedChapterIsDirty ||
      chapterSaving ||
      chapterError
    ) {
      return;
    }

    chapterAutosaveTimerRef.current = setTimeout(() => {
      chapterAutosaveTimerRef.current = null;
      void persistChapter(selectedChapter);
    }, 1200);

    return () => {
      if (chapterAutosaveTimerRef.current) {
        clearTimeout(chapterAutosaveTimerRef.current);
        chapterAutosaveTimerRef.current = null;
      }
    };
  }, [
    selectedChapter,
    selectedChapterIsDirty,
    chapterSaving,
    chapterError,
    persistChapter,
  ]);
  const moveChapter = async (chapterId: string, direction: -1 | 1) => {
    if (!book) return;

    const currentIndex = chapters.findIndex((chapter) => chapter.id === chapterId);
    const targetIndex = currentIndex + direction;

    if (
      currentIndex < 0 ||
      targetIndex < 0 ||
      targetIndex >= chapters.length
    ) {
      return;
    }

    const reordered = [...chapters];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    try {
      const response = await fetch(`/api/studio/books/${book.id}/chapters`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chapterIds: reordered.map((chapter) => chapter.id),
        }),
      });

      const payload = (await response.json()) as {
        chapters?: Chapter[];
        error?: string;
      };

      if (!response.ok || !payload.chapters) {
        setChapterError(payload.error ?? "Unable to reorder chapters.");
        return;
      }

      setChapters(payload.chapters);
    } catch {
      setChapterError("Unable to reorder chapters.");
    }
  };

  const deleteChapter = async () => {
    if (!book || !selectedChapter) return;

    if (!window.confirm(`Delete "${selectedChapter.title}"?`)) {
      return;
    }

    setChapterError(null);

    try {
      const response = await fetch(
        `/api/studio/books/${book.id}/chapters/${selectedChapter.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setChapterError(payload.error ?? "Unable to delete chapter.");
        return;
      }

      const remaining = chapters.filter(
        (chapter) => chapter.id !== selectedChapter.id,
      );

      setChapters(remaining);
      setChapterBaselines((current) => {
        const next = { ...current };
        delete next[selectedChapter.id];
        return next;
      });
      resetRevisionHistory();
      setSelectedChapterId(remaining[0]?.id ?? null);
    } catch {
      setChapterError("Unable to delete chapter.");
    }
  };

  if (bookError && !book) {
    return (
      <main className="bg-[var(--bookshop-bg)]">
        <div className="mx-auto w-11/12 py-12 sm:w-10/12 lg:w-4/5">
          <div className="bookshop-card rounded-3xl p-8 text-center">
            <h1 className="text-2xl font-semibold text-[var(--bookshop-text)]">
              Unable to open book
            </h1>
            <p className="mt-3 text-[var(--bookshop-muted)]">{bookError}</p>
            <Link href="/studio" className="bookshop-button-primary mt-6 inline-flex px-5 py-2.5 text-sm">
              Back to Studio
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!book) {
    return (
      <main className="bg-[var(--bookshop-bg)]">
        <div className="mx-auto w-11/12 py-12 text-center text-[var(--bookshop-muted)]">
          Loading Writer editorâ€¦
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[var(--bookshop-bg)]">
      <div className="mx-auto w-11/12 space-y-6 py-8 pb-12 sm:w-10/12 lg:w-4/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-700">
              Writer Studio
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--bookshop-text)]">
              {book.title}
            </h1>
            <p data-testid="publishing-status" className="mt-2 text-sm text-[var(--bookshop-muted)]">
              Status: <span className="font-semibold capitalize">{book.status}</span>
            </p>
          </div>
          <Link
            href="/studio"
            onClick={(event) => {
              if (
                !confirmUnsavedChanges(
                  "You have unsaved changes. Leave the editor and discard them?",
                )
              ) {
                event.preventDefault();
              }
            }}
            className="bookshop-button-quiet px-4 py-2 text-sm"
          >
            Back to Studio
          </Link>
        </div>

        <section
          data-testid="manuscript-statistics"
          className="bookshop-card rounded-3xl p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--bookshop-text)]">
                Manuscript statistics
              </h2>
              <p className="text-sm text-[var(--bookshop-muted)]">
                Live counts from the chapters currently loaded in Writer Studio.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <span className="block text-xs uppercase tracking-wide text-[var(--bookshop-muted)]">
                  Chapters
                </span>
                <strong data-testid="manuscript-chapter-count">
                  {manuscriptStatistics.chapters}
                </strong>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wide text-[var(--bookshop-muted)]">
                  Words
                </span>
                <strong data-testid="manuscript-word-count">
                  {manuscriptStatistics.words.toLocaleString()}
                </strong>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wide text-[var(--bookshop-muted)]">
                  Characters
                </span>
                <strong data-testid="manuscript-character-count">
                  {manuscriptStatistics.characters.toLocaleString()}
                </strong>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wide text-[var(--bookshop-muted)]">
                  Read time
                </span>
                <strong data-testid="manuscript-reading-time">
                  {manuscriptStatistics.estimatedReadingMinutes} min
                </strong>
              </div>
            </div>
          </div>
        </section>
        <form
          onSubmit={saveBook}
          className="bookshop-card grid gap-5 rounded-3xl p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-semibold text-[var(--bookshop-text)]">
                  Book details
                </h2>
                <span
                  data-testid="book-save-state"
                  className="bookshop-badge bookshop-badge-neutral normal-case tracking-normal"
                >
                  {writerSaveStateLabel(bookSaveState)}
                </span>
                {hasUnsavedChanges ? (
                  <span
                    data-testid="unsaved-change-guard"
                    className="text-xs font-medium text-amber-700 dark:text-amber-300"
                  >
                    Leaving this editor will require confirmation.
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-[var(--bookshop-muted)]">
                Metadata autosaves after a short pause. Submit completed work for Admin review.
              </p>
              {book.status === "changes_requested" && book.moderationReason ? (
                <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100">
                  <strong>Admin feedback:</strong> {book.moderationReason}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {book.status === "draft" || book.status === "changes_requested" ? (
                <button type="button" onClick={() => {
                  if (
                    confirmUnsavedChanges(
                      "You have unsaved changes. Submit for review and discard those unsaved edits?",
                    )
                  ) {
                    void changeStatus("in_review");
                  }
                }} className="bookshop-button-primary px-3 py-2 text-sm">
                  Submit for review
                </button>
              ) : null}
              {book.status === "in_review" ? (
                <span className="bookshop-badge bookshop-badge-neutral normal-case tracking-normal">
                  Awaiting Admin review
                </span>
              ) : null}
              {book.status !== "in_review" && book.status !== "archived" ? (
                <button type="button" onClick={() => {
                  if (
                    confirmUnsavedChanges(
                      "You have unsaved changes. Change publishing status and discard those unsaved edits?",
                    )
                  ) {
                    void changeStatus("archived");
                  }
                }} className="bookshop-button-quiet px-3 py-2 text-sm">
                  Archive
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[var(--bookshop-text)]">Title</span>
              <input
                className="bookshop-input"
                value={book.title}
                onChange={(event) =>
                  setBook((current) =>
                    current ? { ...current, title: event.target.value } : current,
                  )
                }
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[var(--bookshop-text)]">Genre</span>
              <input
                className="bookshop-input"
                value={book.genre}
                onChange={(event) =>
                  setBook((current) =>
                    current ? { ...current, genre: event.target.value } : current,
                  )
                }
              />
            </label>

            <section className="grid gap-3" aria-labelledby="cover-image-heading">
              <span id="cover-image-heading" className="text-sm font-semibold text-[var(--bookshop-text)]">
                Cover image
              </span>
              {book.coverUrl ? (
                <div className="relative aspect-[2/3] w-32 overflow-hidden rounded-xl border border-[var(--bookshop-border)] bg-[var(--bookshop-surface-muted)]">
                  <Image
                    src={book.coverUrl}
                    alt={`Cover preview for ${book.title}`}
                    fill
                    sizes="128px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex aspect-[2/3] w-32 items-center justify-center rounded-xl border border-dashed border-[var(--bookshop-border)] bg-[var(--bookshop-surface-muted)] px-3 text-center text-xs text-[var(--bookshop-muted)]">
                  No cover uploaded
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <label className="bookshop-button-secondary cursor-pointer px-3 py-2 text-sm">
                  {book.coverUrl ? "Replace cover" : "Upload cover"}
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={coverUploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void uploadCover(file);
                    }}
                  />
                </label>
                {book.coverUrl ? (
                  <button
                    type="button"
                    disabled={coverUploading}
                    onClick={() => void removeCover()}
                    className="bookshop-button-quiet px-3 py-2 text-sm disabled:opacity-60"
                  >
                    Remove cover
                  </button>
                ) : null}
              </div>
              <p className="text-xs text-[var(--bookshop-muted)]">
                JPEG, PNG or WebP, up to 5 MB.
              </p>
              {coverUploading ? <p className="text-sm text-[var(--bookshop-muted)]">Uploading cover...</p> : null}
              {coverError ? <p role="alert" className="text-sm font-medium text-rose-700 dark:text-rose-300">{coverError}</p> : null}
            </section>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[var(--bookshop-text)]">Price (Â£)</span>
              <input
                className="bookshop-input"
                type="number"
                min="0"
                step="0.01"
                value={book.price}
                onChange={(event) =>
                  setBook((current) =>
                    current
                      ? { ...current, price: Number(event.target.value) }
                      : current,
                  )
                }
              />
            </label>
          </div>

          <section className="grid gap-4 rounded-2xl border border-[var(--bookshop-border)] bg-[var(--bookshop-surface-muted)] p-5" aria-labelledby="book-files-heading">
            <div>
              <h2 id="book-files-heading" className="text-sm font-semibold text-[var(--bookshop-text)]">Manuscript and sample files</h2>
              <p className="mt-1 text-xs text-[var(--bookshop-muted)]">Private PDF or EPUB storage, up to 25 MB per file. Reader downloads require a library entitlement.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {([
                { type: "MANUSCRIPT" as const, label: "Manuscript", file: manuscriptFile },
                { type: "SAMPLE" as const, label: "Sample", file: sampleFile },
              ]).map((item) => (
                <div key={item.type} className="rounded-xl border border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] p-4">
                  <p className="text-sm font-semibold text-[var(--bookshop-text)]">{item.label}</p>
                  {item.file ? (
                    <p className="mt-2 break-all text-xs text-[var(--bookshop-muted)]">
                      {item.file.originalName} · {item.file.format} · {(item.file.sizeBytes / 1024).toFixed(1)} KB
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-[var(--bookshop-muted)]">No {item.label.toLowerCase()} uploaded.</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <label className="bookshop-button-secondary cursor-pointer px-3 py-2 text-xs">
                      {item.file ? `Replace ${item.label.toLowerCase()}` : `Upload ${item.label.toLowerCase()}`}
                      <input
                        className="sr-only"
                        type="file"
                        aria-label={`Upload ${item.label.toLowerCase()}`}
                        accept="application/pdf,application/epub+zip,.pdf,.epub"
                        disabled={bookFileUploading !== null}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (file) void uploadBookFile(item.type, file);
                        }}
                      />
                    </label>
                    {item.file ? (
                      <button
                        type="button"
                        className="bookshop-button-quiet px-3 py-2 text-xs disabled:opacity-60"
                        disabled={bookFileUploading !== null}
                        onClick={() => void removeBookFile(item.type)}
                      >
                        Remove {item.label.toLowerCase()}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            {bookFileUploading ? <p className="text-sm text-[var(--bookshop-muted)]">Saving {bookFileUploading.toLowerCase()}...</p> : null}
            {bookFileError ? <p role="alert" className="text-sm font-medium text-rose-700 dark:text-rose-300">{bookFileError}</p> : null}
          </section>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[var(--bookshop-text)]">Description</span>
            <textarea
              className="bookshop-input min-h-32"
              value={book.description}
              onChange={(event) =>
                setBook((current) =>
                  current ? { ...current, description: event.target.value } : current,
                )
              }
            />
          </label>

          {bookError ? (
            <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
              {bookError}
            </p>
          ) : null}

          <div>
            <button
              disabled={bookSaving || !bookIsDirty}
              type="submit"
              className="bookshop-button-primary px-5 py-2.5 text-sm disabled:opacity-60"
            >
              {bookSaving ? "Savingâ€¦" : "Save book details"}
            </button>
          </div>
        </form>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <section className="bookshop-card rounded-3xl p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--bookshop-text)]">
                  Chapters
                </h2>
                <p className="text-xs text-[var(--bookshop-muted)]">
                  Stable PostgreSQL chapters
                </p>
              </div>
              <button
                type="button"
                onClick={() => void addChapter()}
                className="bookshop-button-primary px-3 py-2 text-sm"
              >
                Add
              </button>
            </div>

            <div className="space-y-2">
              {chapters.length === 0 ? (
                <p className="rounded-2xl bg-[var(--bookshop-surface-muted)] p-4 text-sm text-[var(--bookshop-muted)]">
                  No chapters yet. Add the first chapter to begin writing.
                </p>
              ) : null}

              {chapters.map((chapter, index) => (
                <div
                  key={chapter.id}
                  className={`rounded-2xl border p-3 ${
                    selectedChapterId === chapter.id
                      ? "border-violet-500 bg-violet-50/60 dark:bg-violet-950/20"
                      : "border-[var(--bookshop-border)]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectChapterSafely(chapter.id)}
                    className="w-full text-left"
                  >
                    <span className="text-xs text-[var(--bookshop-muted)]">
                      Chapter {chapter.chapterNo}
                    </span>
                    <span className="mt-1 block font-medium text-[var(--bookshop-text)]">
                      {chapter.title}
                    </span>
                    {chapter.isPreview ? (
                      <span className="mt-1 block text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        Preview enabled
                      </span>
                    ) : null}
                  </button>

                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => void moveChapter(chapter.id, -1)}
                      className="bookshop-button-quiet px-2 py-1 text-xs disabled:opacity-40"
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      disabled={index === chapters.length - 1}
                      onClick={() => void moveChapter(chapter.id, 1)}
                      className="bookshop-button-quiet px-2 py-1 text-xs disabled:opacity-40"
                    >
                      Down
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bookshop-card rounded-3xl p-5">
            {selectedChapter ? (
              <div className="grid gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-semibold text-[var(--bookshop-text)]">
                        Chapter {selectedChapter.chapterNo}
                      </h2>
                      <span
                        data-testid="chapter-save-state"
                        className="bookshop-badge bookshop-badge-neutral normal-case tracking-normal"
                      >
                        {writerSaveStateLabel(chapterSaveState)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--bookshop-muted)]">
                      ID remains stable when this chapter is saved or reordered.
                      Unsaved chapter edits autosave after a short pause.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={toggleRevisionHistory}
                      className="bookshop-button-quiet px-3 py-2 text-sm"
                    >
                      {revisionHistoryOpen ? "Hide revision history" : "Show revision history"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteChapter()}
                      className="text-sm font-medium text-rose-700 hover:underline dark:text-rose-300"
                    >
                      Delete chapter
                    </button>
                  </div>
                </div>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[var(--bookshop-text)]">
                    Chapter title
                  </span>
                  <input
                    className="bookshop-input"
                    value={selectedChapter.title}
                    onChange={(event) =>
                      setChapters((current) =>
                        current.map((chapter) =>
                          chapter.id === selectedChapter.id
                            ? { ...chapter, title: event.target.value }
                            : chapter,
                        ),
                      )
                    }
                  />
                </label>

                <label className="flex items-center gap-3 text-sm text-[var(--bookshop-text)]">
                  <input
                    type="checkbox"
                    checked={selectedChapter.isPreview}
                    onChange={(event) =>
                      setChapters((current) =>
                        current.map((chapter) =>
                          chapter.id === selectedChapter.id
                            ? { ...chapter, isPreview: event.target.checked }
                            : chapter,
                        ),
                      )
                    }
                  />
                  Allow this chapter as a public preview
                </label>

                <div
                  data-testid="chapter-statistics"
                  className="grid grid-cols-2 gap-3 rounded-2xl bg-[var(--bookshop-surface-muted)] p-4 text-sm sm:grid-cols-4"
                >
                  <div>
                    <span className="block text-xs uppercase tracking-wide text-[var(--bookshop-muted)]">
                      Words
                    </span>
                    <strong data-testid="chapter-word-count">
                      {selectedChapterStatistics.words.toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wide text-[var(--bookshop-muted)]">
                      Characters
                    </span>
                    <strong data-testid="chapter-character-count">
                      {selectedChapterStatistics.characters.toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wide text-[var(--bookshop-muted)]">
                      No spaces
                    </span>
                    <strong data-testid="chapter-character-no-spaces">
                      {selectedChapterStatistics.charactersWithoutSpaces.toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wide text-[var(--bookshop-muted)]">
                      Read time
                    </span>
                    <strong data-testid="chapter-reading-time">
                      {selectedChapterStatistics.estimatedReadingMinutes} min
                    </strong>
                  </div>
                </div>
                <div className="grid gap-3">
                  <div
                    data-testid="markdown-toolbar"
                    className="flex flex-wrap gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => applyLineMarkdown("# ")}
                      className="bookshop-button-quiet px-3 py-2 text-xs"
                    >
                      Heading
                    </button>
                    <button
                      type="button"
                      onClick={() => applyInlineMarkdown("**")}
                      className="bookshop-button-quiet px-3 py-2 text-xs"
                    >
                      Bold
                    </button>
                    <button
                      type="button"
                      onClick={() => applyInlineMarkdown("*")}
                      className="bookshop-button-quiet px-3 py-2 text-xs"
                    >
                      Italic
                    </button>
                    <button
                      type="button"
                      onClick={() => applyLineMarkdown("- ")}
                      className="bookshop-button-quiet px-3 py-2 text-xs"
                    >
                      Bullet
                    </button>
                    <button
                      type="button"
                      onClick={() => applyLineMarkdown("> ")}
                      className="bookshop-button-quiet px-3 py-2 text-xs"
                    >
                      Quote
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setChapterPreviewOpen((current) => !current)
                      }
                      className="bookshop-button-quiet px-3 py-2 text-xs"
                    >
                      {chapterPreviewOpen ? "Hide preview" : "Show preview"}
                    </button>
                  </div>

                  <p className="text-xs text-[var(--bookshop-muted)]">
                    Markdown source is stored directly in this chapter. Supported preview formatting includes headings, bold, italic, bullets and blockquotes.
                  </p>
                </div>

                {chapterPreviewOpen ? (
                  <section
                    data-testid="markdown-preview"
                    className="grid gap-3 rounded-2xl border border-[var(--bookshop-border)] bg-[var(--bookshop-surface-muted)] p-5"
                  >
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--bookshop-muted)]">
                      Chapter preview
                    </h3>

                    {selectedChapterPreviewBlocks.length > 0 ? (
                      <div className="grid gap-3 text-[var(--bookshop-text)]">
                        {selectedChapterPreviewBlocks.map((block, index) => {
                          const text = stripInlineMarkdown(block.text);

                          if (block.type === "heading") {
                            const className =
                              block.level === 1
                                ? "text-2xl font-bold"
                                : block.level === 2
                                  ? "text-xl font-bold"
                                  : "text-lg font-semibold";

                            return (
                              <div
                                key={`${block.type}-${index}`}
                                className={className}
                              >
                                {text}
                              </div>
                            );
                          }

                          if (block.type === "bullet") {
                            return (
                              <div
                                key={`${block.type}-${index}`}
                                className="flex gap-2"
                              >
                                <span aria-hidden="true">-</span>
                                <span>{text}</span>
                              </div>
                            );
                          }

                          if (block.type === "quote") {
                            return (
                              <blockquote
                                key={`${block.type}-${index}`}
                                className="border-l-4 border-violet-400 pl-4 italic text-[var(--bookshop-muted)]"
                              >
                                {text}
                              </blockquote>
                            );
                          }

                          return (
                            <p
                              key={`${block.type}-${index}`}
                              className="leading-7"
                            >
                              {text}
                            </p>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--bookshop-muted)]">
                        Start writing to preview this chapter.
                      </p>
                    )}
                  </section>
                ) : null}
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[var(--bookshop-text)]">
                    Chapter content
                  </span>
                  <textarea
                    className="bookshop-input min-h-[28rem] font-mono text-sm leading-6"
                    ref={chapterContentRef}
                    value={selectedChapter.content}
                    onChange={(event) =>
                      setChapters((current) =>
                        current.map((chapter) =>
                          chapter.id === selectedChapter.id
                            ? { ...chapter, content: event.target.value }
                            : chapter,
                        ),
                      )
                    }
                    placeholder="Start writingâ€¦"
                  />
                </label>

                {revisionHistoryOpen ? (
                  <section
                    data-testid="revision-history"
                    className="grid gap-4 rounded-2xl border border-[var(--bookshop-border)] bg-[var(--bookshop-surface-muted)] p-5"
                  >
                    <div>
                      <h3 className="text-base font-semibold text-[var(--bookshop-text)]">
                        Revision history
                      </h3>
                      <p className="text-xs text-[var(--bookshop-muted)]">
                        Inspect saved versions and restore one without deleting later history.
                      </p>
                    </div>

                    {revisionLoading ? (
                      <p className="text-sm text-[var(--bookshop-muted)]">Loading revisions...</p>
                    ) : chapterRevisions.length > 0 ? (
                      <div className="grid gap-4 lg:grid-cols-[15rem_1fr]">
                        <div className="grid content-start gap-2" aria-label="Saved revisions">
                          {chapterRevisions.map((revision, index) => (
                            <button
                              key={revision.id}
                              type="button"
                              aria-label={`Inspect revision: ${revision.title}`}
                              aria-pressed={selectedRevisionId === revision.id}
                              onClick={() => setSelectedRevisionId(revision.id)}
                              className={`rounded-xl border p-3 text-left text-sm transition ${
                                selectedRevisionId === revision.id
                                  ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                                  : "border-[var(--bookshop-border)] bg-[var(--bookshop-surface)]"
                              }`}
                            >
                              <span className="block font-semibold text-[var(--bookshop-text)]">
                                {index === 0 ? "Latest save" : revision.title}
                              </span>
                              <span className="mt-1 block text-xs text-[var(--bookshop-muted)]">
                                {new Date(revision.createdAt).toLocaleString()}
                              </span>
                            </button>
                          ))}
                        </div>

                        {selectedRevision ? (
                          <div data-testid="revision-comparison" className="grid gap-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <article className="rounded-xl border border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] p-4">
                                <h4 className="text-sm font-semibold text-[var(--bookshop-text)]">Saved revision</h4>
                                <p className="mt-2 text-sm font-medium text-[var(--bookshop-text)]">{selectedRevision.title}</p>
                                <p className="mt-1 text-xs text-[var(--bookshop-muted)]">
                                  Public preview: {selectedRevision.isPreview ? "Yes" : "No"}
                                </p>
                                <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs text-[var(--bookshop-muted)]">
                                  {selectedRevision.content || "No content"}
                                </pre>
                              </article>
                              <article className="rounded-xl border border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] p-4">
                                <h4 className="text-sm font-semibold text-[var(--bookshop-text)]">Current editor</h4>
                                <p className="mt-2 text-sm font-medium text-[var(--bookshop-text)]">{selectedChapter.title}</p>
                                <p className="mt-1 text-xs text-[var(--bookshop-muted)]">
                                  Public preview: {selectedChapter.isPreview ? "Yes" : "No"}
                                </p>
                                <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs text-[var(--bookshop-muted)]">
                                  {selectedChapter.content || "No content"}
                                </pre>
                              </article>
                            </div>
                            <div>
                              <button
                                type="button"
                                disabled={revisionRestoring}
                                onClick={() => void restoreRevision()}
                                className="bookshop-button-secondary px-4 py-2 text-sm disabled:opacity-60"
                              >
                                {revisionRestoring ? "Restoring..." : "Restore this revision"}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--bookshop-muted)]">No saved revisions yet.</p>
                    )}

                    {revisionError ? (
                      <p role="alert" className="text-sm font-medium text-rose-700 dark:text-rose-300">
                        {revisionError}
                      </p>
                    ) : null}
                  </section>
                ) : null}

                {chapterError && chapterConflict ? (
                  <div
                    data-testid="chapter-conflict"
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100"
                  >
                    <div>
                      <p className="font-semibold">A newer chapter version is already saved.</p>
                      <p className="mt-1">{chapterError}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void reloadChapterAfterConflict()}
                      className="bookshop-button-secondary px-3 py-2 text-sm"
                    >
                      Reload latest version
                    </button>
                  </div>
                ) : chapterError ? (
                  <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
                    {chapterError}
                  </p>
                ) : null}

                <div>
                  <button
                    type="button"
                    disabled={chapterSaving || !selectedChapterIsDirty}
                    onClick={() => void saveChapter()}
                    className="bookshop-button-primary px-5 py-2.5 text-sm disabled:opacity-60"
                  >
                    {chapterSaving ? "Savingâ€¦" : "Save chapter"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-[var(--bookshop-muted)]">
                Add or select a chapter to start writing.
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
