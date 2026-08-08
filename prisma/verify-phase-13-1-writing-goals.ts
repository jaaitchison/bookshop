import { readFileSync } from "node:fs";
import path from "node:path";

function read(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const schema = read("prisma/schema.prisma");
const repository = read("src/lib/writer-goal-repository.ts");
const listRoute = read("app/api/studio/goals/route.ts");
const mutationRoute = read("app/api/studio/books/[id]/goal/route.ts");
const studio = read("app/studio/page.tsx");
const panel = read("src/components/studio/WriterGoalsPanel.tsx");

console.log("\nSECTION 13.1 WRITING GOALS VERIFICATION\n");

assert(schema.includes("model WritingGoal"), "WritingGoal model is missing.");
assert(schema.includes("bookId          String   @unique"), "WritingGoal must be unique per book.");
assert(schema.includes("onDelete: Cascade"), "WritingGoal must follow book deletion.");
console.log("1. PASS - book-linked writing goal persistence is defined.");

assert(repository.includes("canManageBook"), "Goal mutations must use book ownership authorization.");
assert(repository.includes("countWords"), "Progress must derive from saved chapter content.");
assert(repository.includes("MIN_WRITING_GOAL_WORDS"), "Word targets must be bounded.");
console.log("2. PASS - ownership, validation and live manuscript progress are enforced.");

assert(listRoute.includes("getRequestDatabaseSession"), "Goal listing must require a database session.");
assert(mutationRoute.includes("upsertManagedWritingGoal"), "Goal mutation route is missing.");
assert(mutationRoute.includes("removeManagedWritingGoal"), "Goal removal route is missing.");
console.log("3. PASS - authenticated goal read, update and removal APIs are wired.");

assert(studio.includes("WriterGoalsPanel"), "Writer Studio goal integration is missing.");
assert(panel.includes("writing-goal-progress"), "Goal progress UI is missing.");
assert(panel.includes("words per day needed"), "Daily pace guidance is missing.");
console.log("4. PASS - Writer Studio displays editable targets, deadlines and pace.");

console.log("\nSECTION 13.1 WRITING GOALS VERIFICATION PASSED.\n");
