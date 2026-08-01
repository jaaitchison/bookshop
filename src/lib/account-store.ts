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
  stripeProcessedEvents: string[];
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
      stripeProcessedEvents: Array.isArray(parsed.stripeProcessedEvents) ? parsed.stripeProcessedEvents : [],
    };
  } catch {
    await fs.mkdir(path.dirname(accountStoreFile), { recursive: true });
    await fs.writeFile(accountStoreFile, JSON.stringify({ users: [], profiles: {}, ordersByProfile: {}, sessions: {}, stripeProcessedEvents: [] }, null, 2), 'utf8');
    return { users: [], profiles: {}, ordersByProfile: {}, sessions: {}, stripeProcessedEvents: [] };
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
  const existingOrders = state.ordersByProfile[profileId] ?? [];
  const nextOrders = [order, ...existingOrders.filter((currentOrder) => currentOrder.id !== order.id)];
  state.ordersByProfile[profileId] = nextOrders;
  await writeStore(state);
  return nextOrders;
}

export async function getAccountOrders(profileId: string): Promise<AccountOrder[]> {
  const state = await readStore();
  return state.ordersByProfile[profileId] ?? [];
}

export async function getAccountOrderById(profileId: string, orderId: string): Promise<AccountOrder | undefined> {
  const state = await readStore();
  return (state.ordersByProfile[profileId] ?? []).find((order) => order.id === orderId);
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

export async function hasStripeEventBeenProcessed(eventId: string): Promise<boolean> {
  const state = await readStore();
  return state.stripeProcessedEvents.includes(eventId);
}

export async function markStripeEventProcessed(eventId: string) {
  const state = await readStore();
  if (!state.stripeProcessedEvents.includes(eventId)) {
    state.stripeProcessedEvents.push(eventId);
    await writeStore(state);
  }
}
