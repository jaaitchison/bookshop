"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type StudioBook = {
  id: string;
  title: string;
  description: string;
  genre: string;
  coverUrl: string;
  price: number;
  status: "draft" | "published" | "archived";
};

type Chapter = {
  id: string;
  bookId: string;
  title: string;
  content: string;
  chapterNo: number;
  isPreview: boolean;
};

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

  const selectedChapter = useMemo(
    () => chapters.find((chapter) => chapter.id === selectedChapterId) ?? null,
    [chapters, selectedChapterId],
  );

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
        setChapters(nextChapters);
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

  const saveBook = async (event: FormEvent) => {
    event.preventDefault();

    if (!book) return;

    setBookSaving(true);
    setBookError(null);

    try {
      const response = await fetch(`/api/books/${book.id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: book.title,
          description: book.description,
          genre: book.genre,
          cover: book.coverUrl,
          price: Number(book.price),
        }),
      });

      const payload = (await response.json()) as StudioBook & {
        error?: string;
      };

      if (!response.ok) {
        setBookError(payload.error ?? "Unable to save book metadata.");
        return;
      }

      setBook((current) =>
        current
          ? {
              ...current,
              ...payload,
            }
          : current,
      );
    } catch {
      setBookError("Unable to save book metadata.");
    } finally {
      setBookSaving(false);
    }
  };

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
      setSelectedChapterId(payload.chapter.id);
    } catch {
      setChapterError("Unable to create chapter.");
    }
  };

  const saveChapter = async () => {
    if (!book || !selectedChapter) return;

    setChapterSaving(true);
    setChapterError(null);

    try {
      const response = await fetch(
        `/api/studio/books/${book.id}/chapters/${selectedChapter.id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: selectedChapter.title,
            content: selectedChapter.content,
            isPreview: selectedChapter.isPreview,
          }),
        },
      );

      const payload = (await response.json()) as {
        chapter?: Chapter;
        error?: string;
      };

      if (!response.ok || !payload.chapter) {
        setChapterError(payload.error ?? "Unable to save chapter.");
        return;
      }

      setChapters((current) =>
        current.map((chapter) =>
          chapter.id === payload.chapter!.id ? payload.chapter! : chapter,
        ),
      );
    } catch {
      setChapterError("Unable to save chapter.");
    } finally {
      setChapterSaving(false);
    }
  };

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
            <p className="mt-2 text-sm text-[var(--bookshop-muted)]">
              Status: <span className="font-semibold capitalize">{book.status}</span>
            </p>
          </div>
          <Link href="/studio" className="bookshop-button-quiet px-4 py-2 text-sm">
            Back to Studio
          </Link>
        </div>

        <form
          onSubmit={saveBook}
          className="bookshop-card grid gap-5 rounded-3xl p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[var(--bookshop-text)]">
                Book details
              </h2>
              <p className="text-sm text-[var(--bookshop-muted)]">
                Save metadata separately from chapters.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void changeStatus("draft")} className="bookshop-button-secondary px-3 py-2 text-sm">
                Draft
              </button>
              <button type="button" onClick={() => void changeStatus("published")} className="bookshop-button-primary px-3 py-2 text-sm">
                Publish
              </button>
              <button type="button" onClick={() => void changeStatus("archived")} className="bookshop-button-quiet px-3 py-2 text-sm">
                Archive
              </button>
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

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[var(--bookshop-text)]">Cover URL</span>
              <input
                className="bookshop-input"
                value={book.coverUrl}
                onChange={(event) =>
                  setBook((current) =>
                    current ? { ...current, coverUrl: event.target.value } : current,
                  )
                }
              />
            </label>

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
              disabled={bookSaving}
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
                    onClick={() => setSelectedChapterId(chapter.id)}
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
                    <h2 className="text-lg font-semibold text-[var(--bookshop-text)]">
                      Chapter {selectedChapter.chapterNo}
                    </h2>
                    <p className="text-xs text-[var(--bookshop-muted)]">
                      ID remains stable when this chapter is saved or reordered.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void deleteChapter()}
                    className="text-sm font-medium text-rose-700 hover:underline dark:text-rose-300"
                  >
                    Delete chapter
                  </button>
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

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-[var(--bookshop-text)]">
                    Chapter content
                  </span>
                  <textarea
                    className="bookshop-input min-h-[28rem] font-mono text-sm leading-6"
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

                {chapterError ? (
                  <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
                    {chapterError}
                  </p>
                ) : null}

                <div>
                  <button
                    type="button"
                    disabled={chapterSaving}
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