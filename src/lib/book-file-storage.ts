import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { deleteObject, getPrivateObject, putObject, usesS3ObjectStorage } from "@/src/lib/s3-object-storage";

export type StoredBookFile = {
  storageKey: string;
  delete(): Promise<void>;
};

export type OpenedBookFile = {
  stream: ReadableStream<Uint8Array>;
  sizeBytes: number;
  contentLength: number;
};

export type BookFileByteRange = {
  start: number;
  end: number;
};

export interface BookFileStorage {
  store(input: {
    bookId: string;
    bytes: Uint8Array;
    extension: "pdf" | "epub";
  }): Promise<StoredBookFile>;
  open(storageKey: string, range?: BookFileByteRange): Promise<OpenedBookFile>;
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

  async open(storageKey: string, range?: BookFileByteRange): Promise<OpenedBookFile> {
    const target = resolveStorageKey(storageKey);
    const metadata = await stat(target);
    const start = range?.start ?? 0;
    const end = range?.end ?? metadata.size - 1;
    if (start < 0 || end < start || end >= metadata.size) {
      throw new Error("Invalid private book-file byte range.");
    }
    const nodeStream = createReadStream(target, { start, end });
    return {
      stream: Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>,
      sizeBytes: metadata.size,
      contentLength: end - start + 1,
    };
  }

  async remove(storageKey: string): Promise<void> {
    const target = resolveStorageKey(storageKey);
    await unlink(target).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

class S3PrivateBookFileStorage implements BookFileStorage {
  private objectKey(storageKey: string) {
    if (!STORAGE_KEY_PATTERN.test(storageKey)) throw new Error("Invalid private book-file storage key.");
    return `private/book-files/${storageKey}`;
  }

  async store(input: { bookId: string; bytes: Uint8Array; extension: "pdf" | "epub" }): Promise<StoredBookFile> {
    if (!/^[a-zA-Z0-9_-]+$/.test(input.bookId)) throw new Error("Invalid book storage namespace.");
    const storageKey = `${input.bookId}/${randomUUID()}.${input.extension}`;
    await putObject(this.objectKey(storageKey), input.bytes, input.extension === "pdf" ? "application/pdf" : "application/epub+zip", "private");
    return { storageKey, delete: () => this.remove(storageKey) };
  }

  open(storageKey: string, range?: BookFileByteRange): Promise<OpenedBookFile> {
    return getPrivateObject(this.objectKey(storageKey), range);
  }

  remove(storageKey: string) {
    return deleteObject(this.objectKey(storageKey), "private");
  }
}

export function getBookFileStorage(): BookFileStorage {
  return usesS3ObjectStorage() ? new S3PrivateBookFileStorage() : new LocalPrivateBookFileStorage();
}
