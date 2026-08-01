import { promises as fs } from "fs";
import path from "path";
import type { AccountOrder } from "@/src/types/account";

interface AccountStoreState {
  ordersByProfile: Record<string, AccountOrder[]>;
  stripeProcessedEvents: string[];
}

const accountStoreFile = path.join(
  process.cwd(),
  "data",
  "account-store.json",
);

const emptyStore = (): AccountStoreState => ({
  ordersByProfile: {},
  stripeProcessedEvents: [],
});

async function readStore(): Promise<AccountStoreState> {
  try {
    const content = await fs.readFile(accountStoreFile, "utf8");
    const parsed = JSON.parse(content) as Partial<AccountStoreState>;

    return {
      ordersByProfile: parsed.ordersByProfile ?? {},
      stripeProcessedEvents: Array.isArray(parsed.stripeProcessedEvents)
        ? parsed.stripeProcessedEvents
        : [],
    };
  } catch {
    const initial = emptyStore();
    await fs.mkdir(path.dirname(accountStoreFile), { recursive: true });
    await fs.writeFile(
      accountStoreFile,
      JSON.stringify(initial, null, 2),
      "utf8",
    );
    return initial;
  }
}

async function writeStore(state: AccountStoreState) {
  await fs.mkdir(path.dirname(accountStoreFile), { recursive: true });
  await fs.writeFile(
    accountStoreFile,
    JSON.stringify(state, null, 2),
    "utf8",
  );
}

export async function saveAccountOrder(
  profileId: string,
  order: AccountOrder,
) {
  const state = await readStore();
  const existingOrders = state.ordersByProfile[profileId] ?? [];
  const nextOrders = [
    order,
    ...existingOrders.filter(
      (currentOrder) => currentOrder.id !== order.id,
    ),
  ];

  state.ordersByProfile[profileId] = nextOrders;
  await writeStore(state);
  return nextOrders;
}

export async function getAccountOrders(
  profileId: string,
): Promise<AccountOrder[]> {
  const state = await readStore();
  return state.ordersByProfile[profileId] ?? [];
}

export async function getAccountOrderById(
  profileId: string,
  orderId: string,
): Promise<AccountOrder | undefined> {
  const state = await readStore();
  return (state.ordersByProfile[profileId] ?? []).find(
    (order) => order.id === orderId,
  );
}

export async function hasStripeEventBeenProcessed(
  eventId: string,
): Promise<boolean> {
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