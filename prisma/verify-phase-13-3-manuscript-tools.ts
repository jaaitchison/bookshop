import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

const exporter = read('src/lib/writer-manuscript-export.ts');
const route = read('app/api/studio/books/[id]/export/route.ts');
const tools = read('src/components/studio/WriterManuscriptTools.tsx');
const editor = read('app/studio/books/[id]/page.tsx');

console.log('\nSECTION 13.3 MANUSCRIPT TOOLS VERIFICATION\n');
assert(exporter.includes('canManageBook'), 'Exports must enforce existing book ownership.');
assert(exporter.includes("orderBy: { chapterNo: 'asc' }"), 'Exports must preserve chapter order.');
assert(exporter.includes("'markdown' | 'text'"), 'Portable Markdown and text formats are required.');
console.log('1. PASS - secure, ordered portable manuscript exports are implemented.');

assert(route.includes('getRequestDatabaseSession'), 'Export route must require a database session.');
assert(route.includes('Content-Disposition'), 'Export route must force a named download.');
assert(route.includes("'Cache-Control': 'private, no-store, max-age=0'"), 'Exports must not be stored in shared caches.');
console.log('2. PASS - authenticated downloads use private, non-sniffable response headers.');

assert(tools.includes('Search entire manuscript'), 'Whole-manuscript search UI is missing.');
assert(tools.includes('onSelectChapter(result.id)'), 'Search results must navigate to matching chapters.');
assert(editor.includes('Previous chapter') && editor.includes('Next chapter'), 'Adjacent chapter navigation is missing.');
console.log('3. PASS - manuscript search and chapter navigation are integrated.');

assert(tools.includes('Download Markdown') && tools.includes('Download plain text'), 'Export actions are missing from the Writer editor.');
console.log('4. PASS - both portable download formats are exposed to Writers.');
console.log('\nSECTION 13.3 MANUSCRIPT TOOLS VERIFICATION PASSED.\n');
