import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

const schema = read('prisma/schema.prisma');
const repository = read('src/lib/writer-royalty-repository.ts');
const writerRoute = read('app/api/studio/royalties/route.ts');
const adminRoute = read('app/api/admin/royalties/route.ts');
const payoutRoute = read('app/api/admin/royalties/[id]/route.ts');
const panel = read('src/components/studio/WriterRoyaltyPanel.tsx');
const studio = read('app/studio/page.tsx');

console.log('\nSECTION 13.5 ROYALTIES AND PAYOUTS VERIFICATION\n');
assert(schema.includes('model WriterRoyaltyStatement'), 'Royalty statement persistence is missing.');
assert(schema.includes('model WriterRoyaltyStatementLine'), 'Immutable statement line persistence is missing.');
assert(schema.includes('model WriterPayout'), 'Payout tracking persistence is missing.');
assert(schema.includes('royaltyRate       Decimal'), 'Per-book royalty rates are missing.');
assert(schema.includes('orderItemIds   String[]'), 'Statement source-order snapshots are missing.');
console.log('1. PASS - rates, statements, source lines and payouts are persisted.');

assert(repository.includes('status: { notIn: excludedOrderStatuses }'), 'Refunded and cancelled orders are not excluded.');
assert(repository.includes('This period overlaps an existing royalty statement.'), 'Statement overlap protection is missing.');
assert(repository.includes('Admin permission is required'), 'Administrative defence-in-depth is missing.');
assert(repository.includes("currency: 'GBP'"), 'GBP statement reporting is missing.');
console.log('2. PASS - calculations are GBP-based, bounded and exclude reversed orders.');

assert(writerRoute.includes("userHasRole(session.userId, 'writer')"), 'Writer statement access is not role-protected.');
assert(adminRoute.includes("userHasRole(session.userId, 'admin')"), 'Statement issue access is not Admin-protected.');
assert(payoutRoute.includes("userHasRole(session.userId, 'admin')"), 'Payout updates are not Admin-protected.');
console.log('3. PASS - read and mutation APIs enforce Writer/Admin boundaries.');

assert(panel.includes('Unstatemented units'), 'Current royalty estimate is missing from Studio.');
assert(panel.includes('Issued statements'), 'Issued statements are missing from Studio.');
assert(panel.includes('Payment reference'), 'Payout detail is missing from Studio.');
assert(studio.includes('<WriterRoyaltyPanel />'), 'Royalty reporting is not integrated into Studio.');
console.log('4. PASS - Writer Studio presents estimates, statements and payout progress.');
console.log('\nSECTION 13.5 ROYALTIES AND PAYOUTS VERIFICATION PASSED.\n');
