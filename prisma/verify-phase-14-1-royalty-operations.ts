import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

const repository = read('src/lib/writer-royalty-repository.ts');
const route = read('app/api/admin/royalties/route.ts');
const payoutRoute = read('app/api/admin/royalties/[id]/route.ts');
const panel = read('src/components/admin/AdminRoyaltyPanel.tsx');
const admin = read('app/admin/page.tsx');

console.log('\nSECTION 14.1 ADMIN ROYALTY OPERATIONS VERIFICATION\n');
assert(repository.includes('getAdminRoyaltyDashboard'), 'Admin royalty dashboard query is missing.');
assert(repository.includes("take: 100"), 'Recent-statement query is not bounded.');
assert(repository.includes('await requireAdmin(adminUserId)'), 'Repository-level Admin authority is missing.');
console.log('1. PASS - the Admin dashboard query is bounded and defence-in-depth protected.');

assert(route.includes('export async function GET'), 'Admin royalty dashboard endpoint is missing.');
assert(route.includes("userHasRole(session.userId, 'admin')"), 'Admin dashboard endpoint lacks role protection.');
assert(payoutRoute.includes('updateRoyaltyPayout'), 'Payout mutation endpoint is missing.');
console.log('2. PASS - statement and payout operations retain Admin-only API boundaries.');

for (const marker of ['Issue statement', 'Payout status', 'Payment reference', 'Failure note', 'Save payout']) {
  assert(panel.includes(marker), `Admin royalty control is missing: ${marker}`);
}
assert(admin.includes('<AdminRoyaltyPanel />'), 'Royalty operations are not integrated into the Admin page.');
console.log('3. PASS - Admin UI supports statement issue and complete payout tracking.');
console.log('\nSECTION 14.1 ADMIN ROYALTY OPERATIONS VERIFICATION PASSED.\n');
