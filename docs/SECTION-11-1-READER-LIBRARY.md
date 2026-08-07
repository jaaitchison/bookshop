# Section 11.1 — Reader Library & PDF/EPUB Viewer

## Outcome

Purchased books now move from payment fulfilment into a secure browser reading experience. The `/library` screen queries PostgreSQL `LibraryItem` entitlements, lists every supplied format, and offers separate Read and Download actions.

## Protected delivery

Both file metadata and bytes require a live Reader session and a matching `LibraryItem` for the requested book. Private storage keys never reach the browser.

The existing `/api/library/download/[id]` controller now supports:

- attachment delivery by default;
- same-origin inline delivery only when `mode=inline` is requested;
- single HTTP byte ranges with `206 Partial Content`;
- correct `416 Range Not Satisfiable` responses;
- private, no-store, nosniff and same-origin response headers; and
- streaming selected bytes from the storage abstraction instead of buffering whole manuscripts.

## Browser readers

`/library/read/[id]` provides one protected route for both formats:

- PDF files use the browser's native PDF viewer over the authenticated range endpoint.
- EPUB files are fetched as authenticated bytes and rendered with epub.js in a paginated sandbox. Scripted EPUB content remains disabled.
- Keyboard left/right navigation, Previous/Next controls, progress display, secure download and Mark as finished are available.

epub.js is pinned to the supported 0.3 line with patched `@xmldom/xmldom` and `js-yaml` transitive overrides. `npm audit` reports zero known vulnerabilities for the installed graph.

## Progress security

Reading progress can now be written only when the current Reader owns a `LibraryItem` for the book. This closes the earlier gap where a signed-in Reader could create progress against an arbitrary catalogue book ID.

## Verification commands

```powershell
npm audit --audit-level=high
npm run phase11:verify-reader
npm run phase11:test-reader-runtime
npm run phase11:test-reader-browser
npm run phase11:test-reader
npm run phase9:test-files-runtime
npm run db:verify-reading-progress
npm run lint
npm run build
```

The byte-range behavior follows current browser HTTP range conventions, while EPUB scripted content remains disabled in line with the renderer's security guidance.

## Verification record — 6 August 2026

- `npm audit --audit-level=high` — passed with zero known vulnerabilities.
- `npm run phase11:verify-reader` — all five source checks passed.
- `npm run phase11:test-reader-runtime` — all five authorization, delivery, range, EPUB and progress checks passed.
- `npm run phase11:test-reader-browser` — a real PDF and packaged EPUB both opened in their protected readers; progress persisted.
- `npm run phase9:test-files-runtime` — all private upload, replacement, entitlement and removal regressions passed.
- `npm run db:verify-reading-progress` — create, update, isolation and validation passed with the new entitlement fixture.
- `npm run lint` — passed.
- `npm run build` — passed; all 33 routes compiled, including `/api/library/files/[id]` and `/library/read/[id]`.

During dependency verification, the registry initially resolved epub.js releases with vulnerable XML parsers. The final installation uses epub.js 0.3.93 with patched transitive overrides, and the clean audit was confirmed before the viewer was retained.
