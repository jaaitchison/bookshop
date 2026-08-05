import { NextResponse } from "next/server";
import {
  addCartItemForUser,
  CartValidationError,
  clearCartForUser,
  getCartForUser,
  removeCartItemForUser,
  setCartItemQuantityForUser,
} from "@/src/lib/cart-repository";
import { getRequestDatabaseSession } from "@/src/lib/request-auth";
import { userHasRole } from "@/src/lib/role-authorization";
import type { ResolvedDatabaseSession } from "@/src/lib/database-session";

type ReaderAuthorization =
  | { authorized: true; session: ResolvedDatabaseSession }
  | { authorized: false; response: NextResponse };

async function requireReader(request: Request): Promise<ReaderAuthorization> {
  const session = await getRequestDatabaseSession(request);
  if (!session) {
    return { authorized: false, response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }
  if (!(await userHasRole(session.userId, "reader"))) {
    return { authorized: false, response: NextResponse.json({ error: "Reader access required." }, { status: 403 }) };
  }
  return { authorized: true, session };
}

async function readJson(request: Request) {
  try {
    return (await request.json()) as { bookId?: unknown; quantity?: unknown };
  } catch {
    return null;
  }
}

function mutationError(error: unknown) {
  if (error instanceof CartValidationError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
  }
  console.error("Cart mutation failed", error);
  return NextResponse.json({ error: "Cart update failed." }, { status: 500 });
}

function requireBookId(body: { bookId?: unknown; quantity?: unknown } | null) {
  return typeof body?.bookId === "string" && body.bookId.trim() ? body.bookId.trim() : null;
}

export async function GET(request: Request) {
  const authorization = await requireReader(request);
  if (!authorization.authorized) return authorization.response;
  return NextResponse.json({ cart: await getCartForUser(authorization.session.userId) });
}

export async function POST(request: Request) {
  const authorization = await requireReader(request);
  if (!authorization.authorized) return authorization.response;
  const body = await readJson(request);
  const bookId = requireBookId(body);
  if (!bookId) return NextResponse.json({ error: "A bookId is required." }, { status: 400 });

  try {
    const quantity = body?.quantity === undefined ? 1 : Number(body.quantity);
    return NextResponse.json({ cart: await addCartItemForUser(authorization.session.userId, bookId, quantity) });
  } catch (error) {
    return mutationError(error);
  }
}

export async function PATCH(request: Request) {
  const authorization = await requireReader(request);
  if (!authorization.authorized) return authorization.response;
  const body = await readJson(request);
  const bookId = requireBookId(body);
  if (!bookId || body?.quantity === undefined) {
    return NextResponse.json({ error: "bookId and quantity are required." }, { status: 400 });
  }

  try {
    return NextResponse.json({
      cart: await setCartItemQuantityForUser(
        authorization.session.userId,
        bookId,
        Number(body.quantity),
      ),
    });
  } catch (error) {
    return mutationError(error);
  }
}

export async function DELETE(request: Request) {
  const authorization = await requireReader(request);
  if (!authorization.authorized) return authorization.response;
  const body = await readJson(request);
  const bookId = requireBookId(body);

  try {
    const cart = bookId
      ? await removeCartItemForUser(authorization.session.userId, bookId)
      : await clearCartForUser(authorization.session.userId);
    return NextResponse.json({ cart });
  } catch (error) {
    return mutationError(error);
  }
}
