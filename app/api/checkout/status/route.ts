import { NextResponse } from "next/server";
import { getPaymentAttemptForUserByIntent } from "@/src/lib/payment-attempt-repository";
import { getRequestDatabaseSession } from "@/src/lib/request-auth";

export async function GET(request: Request) {
  const session = await getRequestDatabaseSession(request);
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const paymentIntentId = new URL(request.url).searchParams.get("payment_intent");
  if (!paymentIntentId) {
    return NextResponse.json({ error: "A payment_intent is required." }, { status: 400 });
  }

  const attempt = await getPaymentAttemptForUserByIntent(session.userId, paymentIntentId);
  if (!attempt) return NextResponse.json({ error: "Payment attempt not found." }, { status: 404 });

  return NextResponse.json(
    { attempt },
    { headers: { "Cache-Control": "no-store" } },
  );
}

