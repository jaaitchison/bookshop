export type WriterSaveState =
  | "saved"
  | "unsaved"
  | "saving"
  | "error";

export function resolveWriterSaveState(input: {
  isDirty: boolean;
  isSaving: boolean;
  hasError: boolean;
}): WriterSaveState {
  if (input.isSaving) {
    return "saving";
  }

  if (input.hasError) {
    return "error";
  }

  if (input.isDirty) {
    return "unsaved";
  }

  return "saved";
}

export function writerSaveStateLabel(
  state: WriterSaveState,
): string {
  switch (state) {
    case "saving":
      return "Saving...";
    case "error":
      return "Save failed";
    case "unsaved":
      return "Unsaved changes";
    case "saved":
    default:
      return "Saved";
  }
}