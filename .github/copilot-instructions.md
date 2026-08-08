# Repository Rules: Bookshop (jaaitchison/bookshop)

## 🚨 CRITICAL SCOPE BOUNDARIES & DRIFT PREVENTION
1. **Target Isolation:** You are strictly forbidden from modifying files that are not explicitly requested by the user. If asked to edit a footer component, DO NOT touch header components, global layouts, or navigation bars.
2. **Component Separation:** Header (`<header>`, `Header.*`, navigation menus) and Footer (`<footer>`, `Footer.*`, page baselines) MUST remain decoupled. Edits to one must never touch or re-render the other.
3. **No Unrequested Refactoring:** Fix or edit ONLY the line items requested. Do NOT re-format, rewrite, or "clean up" surrounding functions, imports, CSS selectors, or HTML elements outside the direct prompt scope.
4. **Layout Preservation:** Maintain exact HTML structure and CSS class wrappers for surrounding elements. Do not wrap components in new container divs or change flex/grid hierarchies unless asked.

## 🛠️ BOOKSHOP ARCHITECTURE CONSTRAINTS
- **Target Files First:** Always check the repository file tree and state the exact target file path in your plan before generating code.
- **Minimal Diffs:** Keep all code modifications to the absolute minimum required diff. Avoid wholesale component rewrites.
- **Styles & CSS Scope:** Do not alter global layout styles (`index.css`, `globals.css`, `styles.css`) when fixing single-component visual issues. Modify component-specific scoped styles instead.

## 💡 WORKFLOW & EXPLICIT EXECUTION
- When the user gives a command, state which specific file(s) you plan to edit and ask for confirmation if the task involves more than one file.
- If a requested change might affect layout elements across multiple pages, stop and present a plain text code diff preview first instead of applying multi-file automated edits.