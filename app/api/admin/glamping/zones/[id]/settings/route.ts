import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import pool from "@/lib/db";

// GET /api/admin/glamping/zones/[id]/settings - Fetch zone settings
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.type !== "staff") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: zoneId } = await context.params;

    // Fetch zone settings
    const result = await pool.query(
      `SELECT id, deposit_type, deposit_value, cancellation_policy, house_rules
       FROM glamping_zones
       WHERE id = $1`,
      [zoneId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Zone not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ zone: result.rows[0] });
  } catch (error) {
    console.error("Error in GET /api/admin/glamping/zones/[id]/settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/glamping/zones/[id]/settings - Update zone settings
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.type !== "staff") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: zoneId } = await context.params;
    const body = await request.json();

    // Validate request body
    const { deposit_type, deposit_value, cancellation_policy, house_rules } = body;

    // Validate deposit_type
    if (!deposit_type || !["percentage", "fixed_amount"].includes(deposit_type)) {
      return NextResponse.json(
        { error: "Invalid deposit_type. Must be 'percentage' or 'fixed_amount'" },
        { status: 400 }
      );
    }

    // Validate deposit_value
    if (deposit_value === undefined || deposit_value === null) {
      return NextResponse.json(
        { error: "deposit_value is required" },
        { status: 400 }
      );
    }

    const numValue = parseFloat(deposit_value);
    if (isNaN(numValue)) {
      return NextResponse.json(
        { error: "deposit_value must be a valid number" },
        { status: 400 }
      );
    }

    if (deposit_type === "percentage") {
      if (numValue < 0 || numValue > 100) {
        return NextResponse.json(
          { error: "For percentage type, deposit_value must be between 0 and 100" },
          { status: 400 }
        );
      }
    } else {
      if (numValue < 0) {
        return NextResponse.json(
          { error: "For fixed_amount type, deposit_value must be >= 0" },
          { status: 400 }
        );
      }
    }

    // Validate JSONB structures (cancellation_policy and house_rules)
    const validateMultilingualContent = (content: any, fieldName: string): boolean => {
      if (!content || typeof content !== "object") {
        return false;
      }
      if (!("vi" in content) || !("en" in content)) {
        return false;
      }
      if (typeof content.vi !== "string" || typeof content.en !== "string") {
        return false;
      }
      return true;
    };

    if (!validateMultilingualContent(cancellation_policy, "cancellation_policy")) {
      return NextResponse.json(
        { error: "cancellation_policy must be an object with 'vi' and 'en' string keys" },
        { status: 400 }
      );
    }

    if (!validateMultilingualContent(house_rules, "house_rules")) {
      return NextResponse.json(
        { error: "house_rules must be an object with 'vi' and 'en' string keys" },
        { status: 400 }
      );
    }

    // Update zone settings
    const result = await pool.query(
      `UPDATE glamping_zones
       SET deposit_type = $1,
           deposit_value = $2,
           cancellation_policy = $3,
           house_rules = $4
       WHERE id = $5
       RETURNING id, deposit_type, deposit_value, cancellation_policy, house_rules`,
      [deposit_type, numValue, JSON.stringify(cancellation_policy), JSON.stringify(house_rules), zoneId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Zone not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      zone: result.rows[0],
    });
  } catch (error) {
    console.error("Error in PUT /api/admin/glamping/zones/[id]/settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
