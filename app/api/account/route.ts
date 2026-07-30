import { NextResponse } from 'next/server';
import { getAccountOrders, saveAccountOrder, saveAccountProfile, saveAccountSession, saveAccountUsers, getAccountUsers, clearAccountSession } from '@/src/lib/account-store';
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

  if (email) {
    const users = await getAccountUsers();
    const user = users.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json(user);
  }

  if (profileId) {
    const orders = await getAccountOrders(profileId);
    return NextResponse.json({ orders });
  }

  return NextResponse.json({ users: await getAccountUsers() });
}

export async function POST(request: Request) {
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
    return NextResponse.json({ ok: true });
  }

  if (body.type === 'place-order' && body.profileId && body.order) {
    const orders = await saveAccountOrder(body.profileId, body.order);
    return NextResponse.json({ orders });
  }

  if (body.type === 'signout' && body.email) {
    await clearAccountSession(body.email);
    return NextResponse.json({ ok: true });
  }

  if (body.users) {
    await saveAccountUsers(body.users);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unsupported account action.' }, { status: 400 });
}
