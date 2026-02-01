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
      `SELECT id, deposit_type, deposit_value, cancellation_policy, house_rules,
              COALESCE(enable_dinner_reminder_email, true) as enable_dinner_reminder_email,
              COALESCE(enable_single_person_surcharge_alert, false) as enable_single_person_surcharge_alert,
              COALESCE(single_person_surcharge_alert_text, '{"vi": "Số tiền đã bao gồm phụ thu 1 người", "en": "Price includes single person surcharge"}'::jsonb) as single_person_surcharge_alert_text
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
    const { deposit_type, deposit_value, cancellation_policy, house_rules, enable_dinner_reminder_email, enable_single_person_surcharge_alert, single_person_surcharge_alert_text } = body;

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

    // Validate single_person_surcharge_alert_text if provided
    if (single_person_surcharge_alert_text !== undefined && !validateMultilingualContent(single_person_surcharge_alert_text, "single_person_surcharge_alert_text")) {
      return NextResponse.json(
        { error: "single_person_surcharge_alert_text must be an object with 'vi' and 'en' string keys" },
        { status: 400 }
      );
    }

    // Update zone settings
    const result = await pool.query(
      `UPDATE glamping_zones
       SET deposit_type = $1,
           deposit_value = $2,
           cancellation_policy = $3,
           house_rules = $4,
           enable_dinner_reminder_email = $5,
           enable_single_person_surcharge_alert = $6,
           single_person_surcharge_alert_text = $7
       WHERE id = $8
       RETURNING id, deposit_type, deposit_value, cancellation_policy, house_rules, enable_dinner_reminder_email, enable_single_person_surcharge_alert, single_person_surcharge_alert_text`,
      [
        deposit_type,
        numValue,
        JSON.stringify(cancellation_policy),
        JSON.stringify(house_rules),
        enable_dinner_reminder_email !== false,
        enable_single_person_surcharge_alert === true,
        single_person_surcharge_alert_text ? JSON.stringify(single_person_surcharge_alert_text) : '{"vi": "Số tiền đã bao gồm phụ thu 1 người", "en": "Price includes single person surcharge"}',
        zoneId
      ]
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
