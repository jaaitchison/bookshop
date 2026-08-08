# Section 13.3 — Manuscript Search, Navigation and Export

Section 13.3 makes larger manuscripts easier to work with and provides portable copies without exposing private Writer content.

## Delivered

- Instant whole-manuscript search across loaded chapter titles and content.
- Match snippets and one-click navigation to the matching chapter.
- Previous/next chapter controls that retain existing unsaved-change protection.
- Secure Markdown and plain-text exports generated from saved PostgreSQL chapters.
- Stable chapter ordering, book metadata, UTF-8 output and safe download filenames.
- Private, non-cacheable download responses protected by Writer/Admin role and book ownership checks.

## Verification

```powershell
npm run phase13:verify-manuscript-tools
npm run phase13:test-manuscript-tools-runtime
npm run phase13:test-manuscript-tools-browser
npm run phase13:test-planning-runtime
npm run phase13:test-goals-runtime
npm run studio:test-browser
npm run lint
npm run build
```

## Next step

Section 13.4 will add secure editorial comments, resolution state and explicit collaborator permissions.
