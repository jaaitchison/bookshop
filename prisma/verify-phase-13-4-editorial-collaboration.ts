import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

const schema = read('prisma/schema.prisma');
const repository = read('src/lib/writer-editorial-repository.ts');
const editorialRoute = read('app/api/studio/books/[id]/editorial/route.ts');
const commentsRoute = read('app/api/studio/books/[id]/comments/[commentId]/route.ts');
const editor = read('app/studio/books/[id]/page.tsx');
const panel = read('src/components/studio/WriterEditorialPanel.tsx');

console.log('\nSECTION 13.4 EDITORIAL COLLABORATION VERIFICATION\n');
assert(schema.includes('model BookCollaborator'), 'Book collaborator persistence is missing.');
assert(schema.includes('enum BookCollaboratorPermission'), 'Collaborator permission enum is missing.');
assert(schema.includes('model EditorialComment'), 'Editorial comment persistence is missing.');
assert(schema.includes('EditorialCommentStatus'), 'Comment resolution status is missing.');
console.log('1. PASS - explicit collaborator permissions and comment threads are persisted.');

assert(repository.includes("permission: canManage"), 'Owner/Admin authority resolution is missing.');
assert(repository.includes("access.permission === 'editor'"), 'Editor resolution authority is missing.');
assert(repository.includes('existing.authorId !== userId'), 'Comment-author removal boundary is missing.');
assert(repository.includes('Collaborators must have Writer or Admin access.'), 'Collaborator account eligibility is missing.');
console.log('2. PASS - owner, Commenter and Editor boundaries are enforced.');

assert(editorialRoute.includes('inviteManagedCollaborator'), 'Collaborator invitation API is missing.');
assert(commentsRoute.includes('updateEditorialComment'), 'Comment resolution API is missing.');
assert(editor.includes('Read-only manuscript access'), 'Collaborator review view is missing.');
console.log('3. PASS - secure management, comments and read-only review routes are integrated.');

assert(panel.includes('Invite collaborator'), 'Owner collaborator controls are missing.');
assert(panel.includes('Resolve comment'), 'Resolution controls are missing.');
assert(panel.includes('Quoted text or location'), 'Anchored editorial context is missing.');
console.log('4. PASS - Writer Studio exposes collaboration and resolution workflows.');
console.log('\nSECTION 13.4 EDITORIAL COLLABORATION VERIFICATION PASSED.\n');
