export type MarkdownBlock =
  | {
      type: "heading";
      level: 1 | 2 | 3;
      text: string;
    }
  | {
      type: "paragraph";
      text: string;
    }
  | {
      type: "bullet";
      text: string;
    }
  | {
      type: "quote";
      text: string;
    };

export type MarkdownSelectionResult = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

export function applyMarkdownWrap(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  before: string,
  after = before,
): MarkdownSelectionResult {
  const selected = value.slice(selectionStart, selectionEnd);

  const nextValue =
    value.slice(0, selectionStart) +
    before +
    selected +
    after +
    value.slice(selectionEnd);

  return {
    value: nextValue,
    selectionStart: selectionStart + before.length,
    selectionEnd:
      selectionEnd + before.length,
  };
}

export function applyMarkdownLinePrefix(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string,
): MarkdownSelectionResult {
  const lineStart =
    value.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;

  const selectedLineEnd = value.indexOf("\n", selectionEnd);
  const lineEnd =
    selectedLineEnd === -1 ? value.length : selectedLineEnd;

  const selectedLines = value.slice(lineStart, lineEnd);
  const prefixed = selectedLines
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");

  const nextValue =
    value.slice(0, lineStart) +
    prefixed +
    value.slice(lineEnd);

  return {
    value: nextValue,
    selectionStart: selectionStart + prefix.length,
    selectionEnd:
      selectionEnd +
      prefix.length *
        selectedLines.split("\n").length,
  };
}

export function parseMarkdownBlocks(
  value: string,
): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];

  for (const rawLine of value.split(/\r?\n/u)) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push({
        type: "heading",
        level: 3,
        text: line.slice(4),
      });
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push({
        type: "heading",
        level: 2,
        text: line.slice(3),
      });
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push({
        type: "heading",
        level: 1,
        text: line.slice(2),
      });
      continue;
    }

    if (line.startsWith("- ")) {
      blocks.push({
        type: "bullet",
        text: line.slice(2),
      });
      continue;
    }

    if (line.startsWith("> ")) {
      blocks.push({
        type: "quote",
        text: line.slice(2),
      });
      continue;
    }

    blocks.push({
      type: "paragraph",
      text: line,
    });
  }

  return blocks;
}

export function stripInlineMarkdown(
  value: string,
): string {
  return value
    .replace(/\*\*(.+?)\*\*/gu, "$1")
    .replace(/\*(.+?)\*/gu, "$1");
}