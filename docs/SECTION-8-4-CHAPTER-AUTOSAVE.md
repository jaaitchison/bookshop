# Section 8.4 â€” Chapter Autosave

## Purpose

Section 8.4 adds debounced autosave for the currently selected Writer chapter.

The manual **Save chapter** button remains available as a fallback.

## Debounce

When the selected chapter becomes dirty, the editor waits 1200 ms after the latest edit before saving.

Further edits during that window cancel and restart the timer.

Switching chapter or unmounting the editor also clears the pending timer.

## Shared persistence path

Manual Save and autosave both use the same `persistChapter()` function and the same secured Section 7.6 chapter PUT endpoint.

## Save state

Autosave integrates with the Section 8.2 save-state system:

- `Unsaved changes`
- `Saving...`
- `Saved`
- `Save failed`

A successful server response replaces that chapter's persisted baseline.

## Stale response protection

Every chapter save receives an increasing request sequence number.

If an older request finishes after a newer request has already started, the older response is ignored for local save-state/baseline purposes.

This prevents slower earlier requests from making the editor appear to have saved stale content.

## Manual fallback

Pressing **Save chapter**:

- cancels any pending debounce timer
- immediately calls the shared persistence path

## Unsaved-change protection

Section 8.3 remains active.

If edits have not yet completed autosaving, navigation protection can still warn the Writer.

After a successful autosave, the dirty state clears and the warning is no longer required.

## Next step

Section 8.5 will add the same debounced-save model to editable Book metadata while keeping Draft / Publish / Archive as explicit non-autosaved actions.