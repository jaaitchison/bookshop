# Section 8.3 â€” Unsaved-change Protection

## Purpose

Section 8.3 uses the dirty-state foundation from Section 8.2 to stop Writers from silently losing unsaved work.

Autosave is still deliberately deferred.

## Protected actions

### Browser close/reload

When either book metadata or the selected chapter is dirty, the editor registers a `beforeunload` handler.

The browser can therefore warn before:

- closing the tab
- reloading
- navigating away outside the React application

### Back to Studio

The loaded editor's **Back to Studio** link checks the combined dirty state.

If unsaved changes exist, leaving requires confirmation.

### Chapter switching

If the selected chapter is dirty, selecting another chapter requires confirmation.

Cancel keeps the Writer on the current chapter with local edits intact.

Confirm switches chapters and intentionally discards the unsaved local chapter state.

### Publishing transitions

Draft / Publish / Archive transitions require confirmation when unsaved editor changes exist.

This prevents a status action from appearing to save unrelated local edits.

## Shared boundary

`hasUnsavedChanges` combines:

- dirty book metadata
- dirty selected chapter

## Visible warning

When unsaved state exists, the editor displays:

`Leaving this editor will require confirmation.`

## Deliberately not included

Section 8.3 does not add:

- autosave
- debounce
- revision snapshots
- conflict detection

## Next step

Section 8.4 will add debounced chapter autosave while retaining:

- dirty-state visibility
- manual Save fallback
- save failure visibility
- unsaved-change protection when a save has not completed