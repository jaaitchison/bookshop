"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewWriterBookPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("Fiction");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState("");
  const [price, setPrice] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const parsedPrice = Number(price);

      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        setError("Price must be zero or greater.");
        return;
      }

      const response = await fetch("/api/books", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          genre,
          description,
          cover,
          price: parsedPrice,
        }),
      });

      const payload = (await response.json()) as {
        id?: string;
        error?: string;
      };

      if (!response.ok || !payload.id) {
        setError(payload.error ?? "Unable to create book.");
        return;
      }

      router.push(`/studio/books/${payload.id}`);
    } catch {
      setError("Unable to create book.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="bg-[var(--bookshop-bg)]">
      <div className="mx-auto w-11/12 py-8 pb-12 sm:w-10/12 lg:w-4/5">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-700">
              Writer Studio
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--bookshop-text)]">
              Create a new book
            </h1>
            <p className="mt-2 text-[var(--bookshop-muted)]">
              New books are created as private Drafts and belong to your Writer account.
            </p>
          </div>
          <Link href="/studio" className="bookshop-button-quiet px-4 py-2 text-sm">
            Back to Studio
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bookshop-card grid gap-5 rounded-3xl p-6 sm:p-8"
        >
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[var(--bookshop-text)]">
              Title
            </span>
            <input
              required
              className="bookshop-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Book title"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[var(--bookshop-text)]">
              Genre
            </span>
            <input
              required
              className="bookshop-input"
              value={genre}
              onChange={(event) => setGenre(event.target.value)}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[var(--bookshop-text)]">
              Description
            </span>
            <textarea
              className="bookshop-input min-h-36"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the book"
            />
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[var(--bookshop-text)]">
                Cover URL
              </span>
              <input
                className="bookshop-input"
                value={cover}
                onChange={(event) => setCover(event.target.value)}
                placeholder="/cover.jpg"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[var(--bookshop-text)]">
                Price (Â£)
              </span>
              <input
                className="bookshop-input"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </label>
          </div>

          {error ? (
            <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              disabled={saving}
              type="submit"
              className="bookshop-button-primary px-5 py-2.5 text-sm disabled:opacity-60"
            >
              {saving ? "Creatingâ€¦" : "Create Draft"}
            </button>
            <Link href="/studio" className="bookshop-button-secondary px-5 py-2.5 text-sm">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}