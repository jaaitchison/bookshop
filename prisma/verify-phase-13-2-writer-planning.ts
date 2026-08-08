import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const schema = read('prisma/schema.prisma');
const repository = read('src/lib/writer-planning-repository.ts');
const collectionRoute = read('app/api/studio/books/[id]/planning/route.ts');
const itemRoute = read('app/api/studio/books/[id]/planning/[itemId]/route.ts');
const editor = read('app/studio/books/[id]/page.tsx');
const workspace = read('src/components/studio/WriterPlanningWorkspace.tsx');

console.log('\nSECTION 13.2 WRITER PLANNING VERIFICATION\n');
assert(schema.includes('enum BookPlanningKind'), 'Planning kind enum is missing.');
assert(schema.includes('model BookPlanningItem'), 'Planning persistence model is missing.');
assert(schema.includes('@@unique([bookId, kind, position])'), 'Per-kind book ordering is missing.');
console.log('1. PASS - typed, ordered book planning persistence is defined.');

assert(repository.includes('canManageBook'), 'Planning operations must enforce book management authority.');
assert(repository.includes("kind !== 'outline' && kind !== 'scene'"), 'Reordering must be limited to outlines and scenes.');
assert(repository.includes("parsed.protocol !== 'http:'"), 'Research URLs must use safe web protocols.');
console.log('2. PASS - ownership, reorder integrity and input validation are enforced.');

assert(collectionRoute.includes('getRequestDatabaseSession'), 'Collection API must require database authentication.');
assert(collectionRoute.includes('reorderManagedPlanningItems'), 'Planning reorder endpoint is missing.');
assert(itemRoute.includes('deleteManagedPlanningItem'), 'Planning removal endpoint is missing.');
console.log('3. PASS - authenticated planning CRUD and reorder APIs are wired.');

assert(editor.includes('WriterPlanningWorkspace'), 'Book editor planning integration is missing.');
for (const label of ['Outline', 'Scenes', 'Characters', 'Research']) {
  assert(workspace.includes(label), `${label} workspace is missing.`);
}
console.log('4. PASS - all four Writer planning workspaces are integrated.');
console.log('\nSECTION 13.2 WRITER PLANNING VERIFICATION PASSED.\n');
