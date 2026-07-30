import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAccountProfile } from '@/src/lib/account-store';
import { getAuthSessionFromCookieHeader } from '@/src/lib/auth-session';

interface CheckoutItem {
  id: string;
  title: string;
  author: string;
  price: number;
  quantity: number;
}

interface CheckoutPayload {
  items: CheckoutItem[];
  shipping?: {
    name: string;
    email: string;
    address: string;
    city: string;
    zip: string;
  };
  profileId?: string;
  email?: string;
  customerName?: string;
}

export async function POST(request: Request) {
  const session = getAuthSessionFromCookieHeader(request.headers.get('cookie'));
  const body = await request.json() as CheckoutPayload;
  const profileId = body.profileId ?? session?.profileId;

  if (!profileId) {
    return NextResponse.json({ error: 'Please sign in before checkout.' }, { status: 401 });
  }

  const profile = await getAccountProfile(profileId);
  if (!profile) {
    return NextResponse.json({ error: 'Account profile could not be found.' }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const checkoutItems = (body.items ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    author: item.author,
    price: item.price,
    quantity: item.quantity,
  }));

  if (!checkoutItems.length) {
    return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json({
      demo: true,
      message: 'Stripe is not configured yet, so checkout is running in demo mode.',
      fallbackUrl: '/checkout/success?demo=1',
    });
  }

  const stripe = new Stripe(stripeSecretKey);
  const orderPayload = {
    id: `order-${Date.now()}`,
    orderedAt: new Date().toISOString(),
    total: checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    status: 'Processing' as const,
    items: checkoutItems,
    shippingName: body.shipping?.name ?? profile.name,
    shippingEmail: body.shipping?.email ?? body.email ?? profile.email,
    shippingAddress: body.shipping?.address ?? '',
    shippingCity: body.shipping?.city ?? '',
    shippingZip: body.shipping?.zip ?? '',
  };

  const sessionPayload = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: body.shipping?.email ?? body.email ?? profile.email,
    line_items: checkoutItems.map((item) => ({
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(item.price * 100),
        product_data: {
          name: item.title,
          description: item.author,
        },
      },
      quantity: item.quantity,
    })),
    metadata: {
      profileId,
      orderPayload: JSON.stringify(orderPayload),
    },
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout?canceled=1`,
  });

  return NextResponse.json({
    checkoutUrl: sessionPayload.url,
    sessionId: sessionPayload.id,
  });
}
