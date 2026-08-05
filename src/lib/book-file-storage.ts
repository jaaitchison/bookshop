import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

export type StoredBookFile = {
  storageKey: string;
  delete(): Promise<void>;
};

export type OpenedBookFile = {
  stream: ReadableStream<Uint8Array>;
  sizeBytes: number;
};

export interface BookFileStorage {
  store(input: {
    bookId: string;
    bytes: Uint8Array;
    extension: "pdf" | "epub";
  }): Promise<StoredBookFile>;
  open(storageKey: string): Promise<OpenedBookFile>;
  remove(storageKey: string): Promise<void>;
}

const privateRoot = path.join(process.cwd(), "storage", "private", "book-files");
const STORAGE_KEY_PATTERN = /^[a-zA-Z0-9_-]+\/[0-9a-f-]+\.(?:pdf|epub)$/i;

function resolveStorageKey(storageKey: string) {
  if (!STORAGE_KEY_PATTERN.test(storageKey)) {
    throw new Error("Invalid private book-file storage key.");
  }

  const target = path.resolve(privateRoot, ...storageKey.split("/"));
  const rootWithSeparator = `${path.resolve(privateRoot)}${path.sep}`;
  if (!target.startsWith(rootWithSeparator)) {
    throw new Error("Invalid private book-file storage path.");
  }
  return target;
}

class LocalPrivateBookFileStorage implements BookFileStorage {
  async store(input: {
    bookId: string;
    bytes: Uint8Array;
    extension: "pdf" | "epub";
  }): Promise<StoredBookFile> {
    if (!/^[a-zA-Z0-9_-]+$/.test(input.bookId)) {
      throw new Error("Invalid book storage namespace.");
    }

    const storageKey = `${input.bookId}/${randomUUID()}.${input.extension}`;
    const target = resolveStorageKey(storageKey);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, input.bytes, { flag: "wx" });

    return {
      storageKey,
      delete: () => this.remove(storageKey),
    };
  }

  async open(storageKey: string): Promise<OpenedBookFile> {
    const target = resolveStorageKey(storageKey);
    const metadata = await stat(target);
    const nodeStream = createReadStream(target);
    return {
      stream: Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>,
      sizeBytes: metadata.size,
    };
  }

  async remove(storageKey: string): Promise<void> {
    const target = resolveStorageKey(storageKey);
    await unlink(target).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

export function getBookFileStorage(): BookFileStorage {
  return new LocalPrivateBookFileStorage();
}
