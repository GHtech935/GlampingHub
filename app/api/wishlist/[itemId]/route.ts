import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession, isCustomerSession } from '@/lib/auth';

interface RouteParams {
  params: Promise<{
    itemId: string;
  }>;
}

// DELETE /api/wishlist/[itemId] - Remove item from wishlist
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const client = await pool.connect();

  try {
    const session = await getSession();

    if (!session || !isCustomerSession(session)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { itemId } = await params;

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const result = await client.query(
      `DELETE FROM customer_glamping_wishlists
       WHERE customer_id = $1 AND item_id = $2
       RETURNING id`,
      [session.id, itemId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Item not found in wishlist' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Item removed from wishlist',
    });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    return NextResponse.json(
      { error: 'Failed to remove from wishlist' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// GET /api/wishlist/[itemId] - Check if item is in wishlist
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const client = await pool.connect();

  try {
    const session = await getSession();

    if (!session || !isCustomerSession(session)) {
      return NextResponse.json({
        isInWishlist: false,
      });
    }

    const { itemId } = await params;

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const result = await client.query(
      `SELECT id FROM customer_glamping_wishlists
       WHERE customer_id = $1 AND item_id = $2`,
      [session.id, itemId]
    );

    return NextResponse.json({
      isInWishlist: result.rows.length > 0,
    });
  } catch (error) {
    console.error('Error checking wishlist:', error);
    return NextResponse.json(
      { error: 'Failed to check wishlist' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
