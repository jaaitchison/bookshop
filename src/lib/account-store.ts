import { promises as fs } from 'fs';
import path from 'path';
import type { AccountOrder, AccountProfile } from '@/src/types/account';

interface StoredAccountUser {
  id: string;
  email: string;
  password: string;
  profile: AccountProfile;
}

interface AccountStoreState {
  users: StoredAccountUser[];
  profiles: Record<string, AccountProfile>;
  ordersByProfile: Record<string, AccountOrder[]>;
  sessions: Record<string, AccountProfile>;
}

const accountStoreFile = path.join(process.cwd(), 'data', 'account-store.json');

async function readStore(): Promise<AccountStoreState> {
  try {
    const content = await fs.readFile(accountStoreFile, 'utf8');
    const parsed = JSON.parse(content) as Partial<AccountStoreState>;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      profiles: parsed.profiles ?? {},
      ordersByProfile: parsed.ordersByProfile ?? {},
      sessions: parsed.sessions ?? {},
    };
  } catch {
    await fs.mkdir(path.dirname(accountStoreFile), { recursive: true });
    await fs.writeFile(accountStoreFile, JSON.stringify({ users: [], profiles: {}, ordersByProfile: {}, sessions: {} }, null, 2), 'utf8');
    return { users: [], profiles: {}, ordersByProfile: {}, sessions: {} };
  }
}

async function writeStore(state: AccountStoreState) {
  await fs.mkdir(path.dirname(accountStoreFile), { recursive: true });
  await fs.writeFile(accountStoreFile, JSON.stringify(state, null, 2), 'utf8');
}

export async function getAccountUsers() {
  return readStore().then((state) => state.users);
}

export async function saveAccountUsers(users: StoredAccountUser[]) {
  const state = await readStore();
  state.users = users;
  await writeStore(state);
}

export async function saveAccountProfile(profile: AccountProfile) {
  const state = await readStore();
  state.profiles[profile.id] = profile;
  await writeStore(state);
}

export async function getAccountProfile(profileId: string): Promise<AccountProfile | undefined> {
  const state = await readStore();
  return state.profiles[profileId];
}

export async function saveAccountOrder(profileId: string, order: AccountOrder) {
  const state = await readStore();
  const nextOrders = [order, ...(state.ordersByProfile[profileId] ?? [])];
  state.ordersByProfile[profileId] = nextOrders;
  await writeStore(state);
  return nextOrders;
}

export async function getAccountOrders(profileId: string): Promise<AccountOrder[]> {
  const state = await readStore();
  return state.ordersByProfile[profileId] ?? [];
}

export async function saveAccountSession(profile: AccountProfile) {
  const state = await readStore();
  state.sessions[profile.email.toLowerCase()] = profile;
  await writeStore(state);
}

export async function clearAccountSession(email: string) {
  const state = await readStore();
  delete state.sessions[email.toLowerCase()];
  await writeStore(state);
}
