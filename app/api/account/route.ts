import { NextResponse } from 'next/server';
import { getAccountOrders, saveAccountOrder, saveAccountProfile, saveAccountSession, saveAccountUsers, getAccountUsers, clearAccountSession } from '@/src/lib/account-store';
import { AUTH_SESSION_COOKIE, buildAuthSession, encodeAuthSession, getAuthSessionFromCookieHeader, hasSessionRole } from '@/src/lib/auth-session';
import type { AccountOrder, AccountProfile } from '@/src/types/account';

interface StoredAccountUser {
  id: string;
  email: string;
  password: string;
  profile: AccountProfile;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const profileId = searchParams.get('profileId');
  const session = getAuthSessionFromCookieHeader(request.headers.get('cookie'));

  if (email) {
    const users = await getAccountUsers();
    const user = users.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json(user);
  }

  if (profileId) {
    if (!session || (session.profileId !== profileId && !hasSessionRole(session, 'admin'))) {
      return NextResponse.json({ error: 'Unauthorized to access this account order history.' }, { status: 403 });
    }
    const orders = await getAccountOrders(profileId);
    return NextResponse.json({ orders });
  }

  return NextResponse.json({ users: await getAccountUsers() });
}

export async function POST(request: Request) {
  const session = getAuthSessionFromCookieHeader(request.headers.get('cookie'));
  const body = await request.json() as {
    type?: 'sync-profile' | 'sync-session' | 'place-order' | 'signout';
    profile?: AccountProfile;
    users?: StoredAccountUser[];
    profileId?: string;
    order?: AccountOrder;
    email?: string;
  };

  if (body.type === 'sync-profile' && body.profile) {
    await saveAccountProfile(body.profile);
    return NextResponse.json({ ok: true });
  }

  if (body.type === 'sync-session' && body.profile) {
    await saveAccountSession(body.profile);
    const orders = await getAccountOrders(body.profile.id);
    const purchasedBookIds = Array.from(new Set(orders.flatMap((order) => order.items.map((item) => item.id))));
    const response = NextResponse.json({ ok: true });
    response.cookies.set(AUTH_SESSION_COOKIE, encodeAuthSession(buildAuthSession(body.profile, purchasedBookIds)), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  }

  if (body.type === 'place-order' && body.profileId && body.order) {
    if (!session || session.profileId !== body.profileId) {
      return NextResponse.json({ error: 'Unauthorized to place order for this profile.' }, { status: 403 });
    }
    const orders = await saveAccountOrder(body.profileId, body.order);
    const users = await getAccountUsers();
    const profile = users.find((entry) => entry.profile.id === body.profileId)?.profile;
    const response = NextResponse.json({ orders });
    if (profile) {
      const purchasedBookIds = Array.from(new Set(orders.flatMap((order) => order.items.map((item) => item.id))));
      response.cookies.set(AUTH_SESSION_COOKIE, encodeAuthSession(buildAuthSession(profile, purchasedBookIds)), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return response;
  }

  if (body.type === 'signout' && body.email) {
    await clearAccountSession(body.email);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(AUTH_SESSION_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
  }

  if (body.users) {
    await saveAccountUsers(body.users);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unsupported account action.' }, { status: 400 });
}
