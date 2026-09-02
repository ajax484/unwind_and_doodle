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

    const cart = await getCartDetails(supabase, sessionId);
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
    const body = await req.json();

    const { productId, quantity, addons, customization, themeCustomization } = body;
    if (!productId || typeof quantity !== 'number' || quantity < 1) {
      return NextResponse.json(
        { success: false, error: 'Valid productId and quantity (>= 1) are required' },
        { status: 400 }
      );
    }

    const updatedCart = await addItemToCart(supabase, sessionId, {
      productId,
      quantity,
      addons,
      customization,
      themeCustomization,
    });

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
    const body = await req.json();

    const { cartItemId, quantity, customization, themeCustomization } = body;
    if (!cartItemId) {
      return NextResponse.json(
        { success: false, error: 'cartItemId is required' },
        { status: 400 }
      );
    }

    let updatedCart;
    if (typeof quantity === 'number') {
      updatedCart = await updateCartItemQuantity(supabase, sessionId, cartItemId, quantity);
    } else if (customization || themeCustomization) {
      updatedCart = await updateCartItemCustomization(supabase, sessionId, cartItemId, {
        ...customization,
        ...(themeCustomization ? { themeCustomization } : {}),
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Either quantity, customization, or themeCustomization is required' },
        { status: 400 }
      );
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
      updatedCart = await clearCart(supabase, sessionId);
    } else {
      updatedCart = await removeCartItem(supabase, sessionId, cartItemId!);
    }

    const res = NextResponse.json({ success: true, data: updatedCart }, { status: 200 });
    attachCartCookie(res, sessionId);
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error removing cart item';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
