import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_COVER_BYTES = 5 * 1024 * 1024;
export const DEFAULT_COVER_URL = "/images/default-book-cover.svg";
export const ACCEPTED_COVER_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

type AcceptedCoverType = (typeof ACCEPTED_COVER_TYPES)[number];

const TYPE_EXTENSION: Record<AcceptedCoverType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type StoredCover = {
  storageKey: string;
  url: string;
  delete(): Promise<void>;
};

export interface CoverStorage {
  store(input: { bytes: Uint8Array; contentType: AcceptedCoverType }): Promise<StoredCover>;
  remove(storageKeyOrUrl: string): Promise<void>;
}

function isAcceptedCoverType(value: string): value is AcceptedCoverType {
  return ACCEPTED_COVER_TYPES.includes(value as AcceptedCoverType);
}

function detectedCoverType(bytes: Uint8Array): AcceptedCoverType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

export function validateCoverUpload(file: File): Promise<{
  bytes: Uint8Array;
  contentType: AcceptedCoverType;
}> {
  if (!isAcceptedCoverType(file.type)) {
    return Promise.reject(new Error("Choose a JPEG, PNG or WebP image."));
  }

  if (file.size === 0 || file.size > MAX_COVER_BYTES) {
    return Promise.reject(new Error("Cover images must be between 1 byte and 5 MB."));
  }

  return file.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    const contentType = detectedCoverType(bytes);

    if (!contentType || contentType !== file.type) {
      throw new Error("The file contents do not match its image type.");
    }

    return { bytes, contentType };
  });
}

class LocalCoverStorage implements CoverStorage {
  private readonly publicPrefix = "/uploads/covers/";

  async store(input: { bytes: Uint8Array; contentType: AcceptedCoverType }): Promise<StoredCover> {
    const directory = path.join(process.cwd(), "public", "uploads", "covers");
    await mkdir(directory, { recursive: true });
    const filename = `${randomUUID()}.${TYPE_EXTENSION[input.contentType]}`;
    const target = path.join(process.cwd(), "public", "uploads", "covers", filename);
    await writeFile(target, input.bytes, { flag: "wx" });

    return {
      storageKey: filename,
      url: `${this.publicPrefix}${filename}`,
      delete: async () => {
        await unlink(target).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== "ENOENT") throw error;
        });
      },
    };
  }

  async remove(storageKeyOrUrl: string): Promise<void> {
    const filename = storageKeyOrUrl.startsWith(this.publicPrefix)
      ? storageKeyOrUrl.slice(this.publicPrefix.length)
      : storageKeyOrUrl;
    if (!/^[0-9a-f-]+\.(?:jpg|png|webp)$/i.test(filename)) return;

    await unlink(path.join(process.cwd(), "public", "uploads", "covers", filename)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

export function getCoverStorage(): CoverStorage {
  return new LocalCoverStorage();
}

export function coverUrlOrFallback(url: string | null | undefined): string {
  return url?.trim() || DEFAULT_COVER_URL;
}
