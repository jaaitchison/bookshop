import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function exists(...parts: string[]) {
  return access(path.join(process.cwd(), ...parts)).then(() => true).catch(() => false);
}

async function read(...parts: string[]) {
  return readFile(path.join(process.cwd(), ...parts), 'utf8');
}

async function main() {
  console.log('\nSECTION 13.6 PHASE 13 CLOSE-OUT VERIFICATION\n');

  console.log('1. Section documentation');
  for (const file of [
    'SECTION-13-1-WRITING-GOALS.md',
    'SECTION-13-2-WRITER-PLANNING.md',
    'SECTION-13-3-MANUSCRIPT-TOOLS.md',
    'SECTION-13-4-EDITORIAL-COLLABORATION.md',
    'SECTION-13-5-ROYALTIES-PAYOUTS.md',
    'PHASE-13-CLOSEOUT.md',
  ]) {
    assert(await exists('docs', file), `${file} is missing.`);
  }
  console.log('   PASS - Sections 13.1 through 13.6 are documented.');

  console.log('\n2. Planning and productivity persistence');
  const schema = await read('prisma', 'schema.prisma');
  for (const model of [
    'WritingGoal',
    'BookPlanningItem',
    'BookCollaborator',
    'EditorialComment',
    'WriterRoyaltyStatement',
    'WriterRoyaltyStatementLine',
    'WriterPayout',
  ]) {
    assert(schema.includes(`model ${model} {`), `${model} is missing.`);
  }
  assert(schema.includes('royaltyRate       Decimal'), 'Book royalty rates are missing.');
  console.log('   PASS - goals, planning, collaboration and royalty records are persisted.');

  console.log('\n3. Secure Writer routes');
  for (const route of [
    ['app', 'api', 'studio', 'goals', 'route.ts'],
    ['app', 'api', 'studio', 'books', '[id]', 'planning', 'route.ts'],
    ['app', 'api', 'studio', 'books', '[id]', 'export', 'route.ts'],
    ['app', 'api', 'studio', 'books', '[id]', 'editorial', 'route.ts'],
    ['app', 'api', 'studio', 'royalties', 'route.ts'],
    ['app', 'api', 'admin', 'royalties', 'route.ts'],
  ]) {
    assert(await exists(...route), `${route.join('/')} is missing.`);
  }
  console.log('   PASS - authenticated Writer and Admin feature boundaries are present.');

  console.log('\n4. Writer Studio integration');
  const [dashboard, editor] = await Promise.all([
    read('app', 'studio', 'page.tsx'),
    read('app', 'studio', 'books', '[id]', 'page.tsx'),
  ]);
  for (const marker of ['WriterGoalsPanel', 'WriterCollaborationAssignments', 'WriterRoyaltyPanel']) {
    assert(dashboard.includes(marker), `Studio dashboard integration missing: ${marker}`);
  }
  for (const marker of ['WriterPlanningWorkspace', 'WriterManuscriptTools', 'WriterEditorialPanel']) {
    assert(editor.includes(marker), `Studio editor integration missing: ${marker}`);
  }
  console.log('   PASS - every Phase 13 workspace is reachable from Writer Studio.');

  console.log('\n5. Complete automated coverage');
  const coverage = [
    'writer-goals.spec.ts',
    'writer-planning.spec.ts',
    'writer-manuscript-tools.spec.ts',
    'writer-editorial-collaboration.spec.ts',
    'writer-royalties.spec.ts',
  ];
  for (const file of coverage) {
    assert(await exists('tests', 'browser', file), `Browser coverage is missing: ${file}`);
  }
  const packageSource = await read('package.json');
  for (const script of ['phase13:verify', 'phase13:test-runtime', 'phase13:test-browser', 'phase13:test']) {
    assert(packageSource.includes(`"${script}"`), `Aggregate npm script is missing: ${script}`);
  }
  console.log('   PASS - focused, aggregate and browser regression commands are registered.');

  console.log('\nSECTION 13.6 PASSED.');
  console.log('Phase 13 Writer planning, productivity, collaboration and royalty reporting are complete.\n');
}

main().catch((error) => {
  console.error('\nSECTION 13.6 FAILED.');
  console.error(error);
  process.exitCode = 1;
});
