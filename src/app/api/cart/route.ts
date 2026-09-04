import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  getCartDetails,
  addItemToCart,
  updateCartItemQuantity,
  updateCartItemCustomization,
  removeCartItem,
  clearCart,
} from '@/services/cart.service';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { AddToCartSchema, UpdateCartItemSchema } from '@/types/cart';
import { getAuthenticatedUserContext } from '@/services/user-context.service';

const CART_COOKIE_NAME = 'uad_cart_session';

function getOrCreateSessionId(req: NextRequest): { sessionId: string; isNew: boolean } {
  const cookieSession = req.cookies.get(CART_COOKIE_NAME)?.value;
  const headerSession = req.headers.get('x-cart-session');

  if (cookieSession && cookieSession.trim()) {
    return { sessionId: cookieSession.trim(), isNew: false };
  }
  if (headerSession && headerSession.trim()) {
    return { sessionId: headerSession.trim(), isNew: false };
  }

  const newId = `sess_${Date.now().toString(36)}_${crypto.randomBytes(8).toString('hex')}`;
  return { sessionId: newId, isNew: true };
}

async function resolveCustomerId(req: NextRequest): Promise<string | null> {
  try {
    const authContext = await getAuthenticatedUserContext(req);
    if (authContext.authenticated && authContext.userType === 'customer' && authContext.customer?.id) {
      return authContext.customer.id;
    }
  } catch {
    // Non-blocking fallback for guest
  }
  return null;
}

function attachCartCookie(res: NextResponse, sessionId: string) {
  res.cookies.set({
    name: CART_COOKIE_NAME,
    value: sessionId,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const { sessionId, isNew } = getOrCreateSessionId(req);
    const customerId = await resolveCustomerId(req);

    const cart = await getCartDetails(supabase, sessionId, customerId);
    const res = NextResponse.json({ success: true, data: cart }, { status: 200 });

    if (isNew) {
      attachCartCookie(res, sessionId);
    }
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching cart';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const { sessionId } = getOrCreateSessionId(req);
    const customerId = await resolveCustomerId(req);
    const body = await req.json();

    const parseResult = AddToCartSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || 'Invalid request payload';
      return NextResponse.json(
        { success: false, error: firstError, details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { productId, quantity, addons, customization, themeCustomization } = parseResult.data;

    const updatedCart = await addItemToCart(
      supabase,
      sessionId,
      {
        productId,
        quantity,
        addons,
        customization,
        themeCustomization,
      },
      customerId
    );

    const res = NextResponse.json({ success: true, data: updatedCart }, { status: 200 });
    attachCartCookie(res, sessionId);
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error adding item to cart';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const { sessionId } = getOrCreateSessionId(req);
    const customerId = await resolveCustomerId(req);
    const body = await req.json();

    const parseResult = UpdateCartItemSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || 'Invalid request payload';
      return NextResponse.json(
        { success: false, error: firstError, details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { cartItemId, quantity, customization, themeCustomization } = parseResult.data;

    // 1. Update customization if provided
    if (customization || themeCustomization) {
      await updateCartItemCustomization(
        supabase,
        sessionId,
        cartItemId,
        {
          ...customization,
          ...(themeCustomization ? { themeCustomization } : {}),
        },
        customerId
      );
    }

    // 2. Update quantity if provided
    let updatedCart;
    if (typeof quantity === 'number') {
      updatedCart = await updateCartItemQuantity(supabase, sessionId, cartItemId, quantity, customerId);
    } else {
      updatedCart = await getCartDetails(supabase, sessionId, customerId);
    }

    const res = NextResponse.json({ success: true, data: updatedCart }, { status: 200 });
    attachCartCookie(res, sessionId);
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error updating cart item';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const { sessionId } = getOrCreateSessionId(req);
    const customerId = await resolveCustomerId(req);
    const url = new URL(req.url);
    const cartItemId = url.searchParams.get('cartItemId');
    const clearAll = url.searchParams.get('all') === 'true' || url.searchParams.get('clear') === 'true';

    if (!cartItemId && !clearAll) {
      return NextResponse.json(
        { success: false, error: 'cartItemId query parameter is required' },
        { status: 400 }
      );
    }

    let updatedCart;
    if (clearAll) {
      updatedCart = await clearCart(supabase, sessionId, customerId);
    } else {
      updatedCart = await removeCartItem(supabase, sessionId, cartItemId!, customerId);
    }

    const res = NextResponse.json({ success: true, data: updatedCart }, { status: 200 });
    attachCartCookie(res, sessionId);
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error removing cart item';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

