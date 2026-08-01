import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAccountOrderById, getAccountOrders, getAccountProfile, saveAccountOrder, saveAccountSession } from '@/src/lib/account-store';
import { AUTH_SESSION_COOKIE, buildAuthSession, encodeAuthSession } from '@/src/lib/auth-session';
import type { AccountOrder } from '@/src/types/account';

function parseOrderPayload(rawOrderPayload: string | undefined): AccountOrder | null {
  if (!rawOrderPayload) {
    return null;
  }

  let parsed: AccountOrder;
  try {
    parsed = JSON.parse(rawOrderPayload) as AccountOrder;
  } catch {
    return null;
  }

  if (!parsed.id || !Array.isArray(parsed.items) || typeof parsed.total !== 'number') {
    return null;
  }

  return parsed;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing checkout session id.' }, { status: 400 });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json({ ok: true, demo: true, message: 'Stripe is not configured; checkout is still complete in demo mode.' });
  }

  const stripe = new Stripe(stripeSecretKey);
  const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);

  if (stripeSession.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Checkout is still pending payment.' }, { status: 402 });
  }

  const metadata = stripeSession.metadata ?? {};
  const profileId = metadata.profileId;
  const orderPayload = parseOrderPayload(metadata.orderPayload);

  if (!profileId || !orderPayload) {
    return NextResponse.json({ error: 'Checkout session is missing order metadata.' }, { status: 400 });
  }

  const profile = await getAccountProfile(profileId);
  if (!profile) {
    return NextResponse.json({ error: 'Could not find the matching account profile.' }, { status: 404 });
  }

  const existingOrder = await getAccountOrderById(profileId, orderPayload.id);
  if (!existingOrder && process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({
      ok: true,
      pending: true,
      orderId: orderPayload.id,
      message: 'Payment is confirmed. Waiting for secure fulfillment.',
    }, { status: 202 });
  }

  const orders = existingOrder
    ? await getAccountOrders(profileId)
    : await saveAccountOrder(profileId, orderPayload);

  await saveAccountSession(profile);

  const purchasedBookIds = Array.from(new Set(orders.flatMap((order) => order.items.map((item) => item.id))));
  const fulfilledOrder = existingOrder ?? orderPayload;
  const response = NextResponse.json({ ok: true, orderId: fulfilledOrder.id, order: fulfilledOrder, purchasedBookIds });
  response.cookies.set(AUTH_SESSION_COOKIE, encodeAuthSession(buildAuthSession(profile, purchasedBookIds)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
