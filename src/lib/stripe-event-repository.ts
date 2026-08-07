import { getPrismaClient } from "@/src/lib/prisma";

export async function hasStripeWebhookEventBeenProcessed(
  eventId: string,
): Promise<boolean> {
  const prisma = getPrismaClient();

  if (!prisma) {
    throw new Error("Database unavailable for Stripe event tracking.");
  }

  const existing = await prisma.stripeWebhookEvent.findUnique({
    where: { eventId },
    select: { eventId: true },
  });

  return Boolean(existing);
}

export async function markStripeWebhookEventProcessed(
  eventId: string,
  eventType = "",
): Promise<void> {
  const prisma = getPrismaClient();

  if (!prisma) {
    throw new Error("Database unavailable for Stripe event tracking.");
  }

  await prisma.stripeWebhookEvent.upsert({
    where: { eventId },
    update: { eventType },
    create: { eventId, eventType },
  });
}