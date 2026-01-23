// Note: This route is deprecated as products are now linked at the item level
// via glamping_item_menu_products table.
// Products are displayed as read-only info from the item configuration.
// To modify products, update the item in the Item management page.

import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  return NextResponse.json(
    { error: "Products are configured at item level. Use Item management to modify products." },
    { status: 400 }
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  return NextResponse.json(
    { error: "Products are configured at item level. Use Item management to modify products." },
    { status: 400 }
  );
}
