import { BookFileFormat } from "@/src/generated/prisma/client";

export const MAX_BOOK_FILE_BYTES = 25 * 1024 * 1024;

const FORMAT_CONFIG = {
  [BookFileFormat.PDF]: {
    contentType: "application/pdf",
    extension: ".pdf",
  },
  [BookFileFormat.EPUB]: {
    contentType: "application/epub+zip",
    extension: ".epub",
  },
} as const;

function detectFormat(bytes: Uint8Array): BookFileFormat | null {
  const prefix = new TextDecoder("latin1").decode(bytes.slice(0, Math.min(bytes.length, 2048)));

  if (prefix.startsWith("%PDF-")) {
    return BookFileFormat.PDF;
  }

  const isZip =
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04;

  if (isZip && prefix.includes("mimetype") && prefix.includes("application/epub+zip")) {
    return BookFileFormat.EPUB;
  }

  return null;
}

function formatForContentType(contentType: string): BookFileFormat | null {
  return (Object.entries(FORMAT_CONFIG) as Array<[
    BookFileFormat,
    (typeof FORMAT_CONFIG)[BookFileFormat],
  ]>).find(([, config]) => config.contentType === contentType)?.[0] ?? null;
}

export async function validateBookFileUpload(file: File) {
  if (file.size === 0 || file.size > MAX_BOOK_FILE_BYTES) {
    throw new Error("Book files must be between 1 byte and 25 MB.");
  }

  const declaredFormat = formatForContentType(file.type);
  if (!declaredFormat) {
    throw new Error("Choose a PDF or EPUB file.");
  }

  const config = FORMAT_CONFIG[declaredFormat];
  if (!file.name.toLowerCase().endsWith(config.extension)) {
    throw new Error(`The filename must end in ${config.extension}.`);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (detectFormat(bytes) !== declaredFormat) {
    throw new Error("The file contents do not match its declared PDF or EPUB type.");
  }

  const originalName = file.name
    .split(/[\\/]/)
    .pop()!
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .slice(0, 180);

  return {
    bytes,
    format: declaredFormat,
    contentType: config.contentType,
    originalName: originalName || `book${config.extension}`,
    extension: declaredFormat === BookFileFormat.PDF ? "pdf" as const : "epub" as const,
  };
}
