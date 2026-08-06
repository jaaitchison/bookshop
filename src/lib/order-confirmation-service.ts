import { OrderConfirmationStatus } from "@/src/generated/prisma/client";
import { formatGbp } from "@/src/lib/currency";
import { getPrismaClient } from "@/src/lib/prisma";

type ConfirmationMessage = {
  to: string;
  subject: string;
  html: string;
};

export type ConfirmationTransport = (
  message: ConfirmationMessage,
) => Promise<string>;

function requirePrisma() {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("PostgreSQL is unavailable for order confirmations.");
  return prisma;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createResendTransport(): ConfirmationTransport | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_CONFIRMATION_FROM_EMAIL;
  if (!apiKey || !from) return null;

  return async (message) => {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, ...message }),
    });
    const payload = await response.json() as { id?: string; message?: string };
    if (!response.ok || !payload.id) {
      throw new Error(payload.message ?? "Resend rejected the confirmation message.");
    }
    return payload.id;
  };
}

export async function deliverOrderConfirmation(
  orderId: string,
  suppliedTransport?: ConfirmationTransport,
) {
  const prisma = requirePrisma();
  const transport = suppliedTransport ?? createResendTransport();
  if (!transport) return { status: "queued" as const };

  const confirmation = await prisma.orderConfirmation.findUnique({
    where: { orderId },
    include: { order: { include: { items: true } } },
  });
  if (!confirmation) return { status: "missing" as const };
  if (confirmation.status === OrderConfirmationStatus.SENT) {
    return { status: "sent" as const, providerMessageId: confirmation.providerMessageId };
  }

  const claimed = await prisma.orderConfirmation.updateMany({
    where: {
      id: confirmation.id,
      status: { in: [OrderConfirmationStatus.PENDING, OrderConfirmationStatus.FAILED] },
    },
    data: {
      status: OrderConfirmationStatus.SENDING,
      attemptCount: { increment: 1 },
      failureMessage: "",
    },
  });
  if (claimed.count !== 1) return { status: "in_progress" as const };

  const itemRows = confirmation.order.items
    .map((item) => `<li>${escapeHtml(item.titleSnapshot)} &times; ${item.quantity}</li>`)
    .join("");
  const total = formatGbp(confirmation.order.total.toNumber());

  try {
    const providerMessageId = await transport({
      to: confirmation.recipient,
      subject: `Bookshop order ${confirmation.order.id} confirmed`,
      html: [
        `<p>Hello ${escapeHtml(confirmation.order.shippingName)},</p>`,
        "<p>Your payment is confirmed and your books are now available in your library.</p>",
        `<ul>${itemRows}</ul>`,
        `<p><strong>Total: ${escapeHtml(total)}</strong></p>`,
      ].join(""),
    });
    await prisma.orderConfirmation.update({
      where: { id: confirmation.id },
      data: {
        status: OrderConfirmationStatus.SENT,
        providerMessageId,
        sentAt: new Date(),
      },
    });
    return { status: "sent" as const, providerMessageId };
  } catch (error) {
    const failureMessage = error instanceof Error ? error.message : "Confirmation delivery failed.";
    await prisma.orderConfirmation.update({
      where: { id: confirmation.id },
      data: {
        status: OrderConfirmationStatus.FAILED,
        failureMessage: failureMessage.slice(0, 500),
      },
    });
    return { status: "failed" as const, failureMessage };
  }
}
