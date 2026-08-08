# Repository Rules: Bookshop (jaaitchison/bookshop)

## 🎯 CORE DIRECTIVE: ZERO UNREQUESTED EDITS
You are a precision coding assistant. You must ONLY perform the exact task requested by the user. Do NOT modify, refactor, reformat, or "improve" any file, layout, component, or line of code outside the explicit scope of the prompt.

---

## 🔒 1. SCOPE & BOUNDARY ENFORCEMENT
* **Isolated File Access:** Only modify the target file(s) specified in the prompt. If no file is explicitly named, identify the single relevant file, state your selection, and wait for user confirmation before editing.
* **Component Isolation:** Header components (`<header>`, `Header.*`, navigation, branding) and Footer components (`<footer>`, `Footer.*`, baseline links) MUST remain strictly decoupled. Edits to the footer MUST NEVER touch the header, navigation layout, or site header code.
* **No Cascading Changes:** Do not edit global style sheets (`globals.css`, `index.css`, `styles.css`), base layouts, or router config files unless explicitly requested.
* **Preserve Untouched Code:** Keep all surrounding code, indentation, imports, unused variables, and function structures identical. Minimal diffs only.

---

## 🚫 2. STRICT PROHIBITIONS
* **NO Automated Refactoring:** Do NOT rewrite existing working logic into modern patterns, convert functional components, rename variables, or clean up dead code unless told to do so.
* **NO Structural Re-parenting:** Do NOT add new container `<div>` tags, wrapper elements, or alter existing grid/flex structures surrounding the target code.
* **NO Unrequested Dependencies:** Do NOT add, update, or import new npm/pip libraries or external icons. Use only existing imports in the target file.

---

## 🛡️ 3. EXECUTION & SAFETY PROTOCOLS
* **Diff Minimization:** Every file edit must aim for the smallest possible Git diff. 
* **State Plan First for Multi-File Requests:** If a task requires touching more than 1 file, present a 2-sentence breakdown of the target files and planned changes, then request user approval before applying changes.
* **Self-Verification Constraint:** Before finalizing an edit, verify:
  1. Did I touch any line outside the requested scope? (If yes, revert it).
  2. Did I alter any `<header>` or navigation code while editing `<footer>`? (If yes, revert it).
  3. Is the Git diff clean and limited strictly to the requested feature/fix?

---

## 📁 4. PROJECT FILE TARGETING MAP
Use these primary paths to avoid workspace file searches:
* **Footer Logic/Layout:** Check `src/components/Footer.*` or `templates/footer.html`
* **Header Logic/Layout:** Check `src/components/Header.*` or `templates/header.html`
* **Global Styles:** Check `src/styles/` or `public/` (DO NOT EDIT without explicit prompt instruction)