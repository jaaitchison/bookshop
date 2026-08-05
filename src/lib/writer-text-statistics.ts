export type TextStatistics = {
  words: number;
  characters: number;
  charactersWithoutSpaces: number;
  estimatedReadingMinutes: number;
};

export function countWords(value: string): number {
  const trimmed = value.trim();

  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/\s+/u).filter(Boolean).length;
}

export function getTextStatistics(
  value: string,
): TextStatistics {
  const words = countWords(value);
  const characters = value.length;
  const charactersWithoutSpaces =
    value.replace(/\s/gu, "").length;

  return {
    words,
    characters,
    charactersWithoutSpaces,
    estimatedReadingMinutes:
      words === 0 ? 0 : Math.max(1, Math.ceil(words / 225)),
  };
}