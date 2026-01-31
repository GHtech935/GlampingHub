import { NextRequest, NextResponse } from "next/server"
import pool from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Parse search parameters
    const checkIn = searchParams.get("checkIn") || ""
    const checkOut = searchParams.get("checkOut") || ""
    const adults = parseInt(searchParams.get("adults") || "2")
    const children = parseInt(searchParams.get("children") || "0")
    const guests = adults + children
    const provinces = searchParams.get("provinces")?.split(",").filter(Boolean) || []
    const filters = searchParams.get("filters")?.split(",") || []
    const sort = searchParams.get("sort") || "best-match"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "12")
    const offset = (page - 1) * limit

    // Build dynamic SQL query for glamping zones
    let query = `
      SELECT
        z.id,
        z.name,
        z.description,
        z.address,
        z.city,
        z.province,
        z.latitude,
        z.longitude,
        z.is_featured,
        -- Minimum item price from zone (from glamping_pricing table)
        (
          SELECT MIN(p.amount)
          FROM glamping_items i
          LEFT JOIN glamping_pricing p ON p.item_id = i.id AND p.event_id IS NULL
          LEFT JOIN glamping_item_attributes a ON a.item_id = i.id
          WHERE i.zone_id = z.id
            AND COALESCE(a.is_active, true) = true
            AND a.default_calendar_status = 'available'
        ) as base_price,
        -- Featured zone image
        (
          SELECT zi.image_url
          FROM glamping_zone_images zi
          WHERE zi.zone_id = z.id
            AND zi.is_featured = true
          LIMIT 1
        ) as featured_image,
        -- All zone images (max 4 for carousel)
        (
          SELECT json_agg(zi.image_url ORDER BY zi.display_order)
          FROM glamping_zone_images zi
          WHERE zi.zone_id = z.id
          LIMIT 4
        ) as images,
        -- Top 3 items with pricing and category
        (
          SELECT json_agg(
            json_build_object(
              'id', item_data.id,
              'name', item_data.name,
              'category_name', item_data.category_name,
              'base_price', item_data.base_price,
              'sku', item_data.sku,
              'summary', item_data.summary
            )
          )
          FROM (
            SELECT
              i.id,
              i.name,
              COALESCE(c.name, 'N/A') as category_name,
              COALESCE(
                (SELECT MIN(p.amount)
                 FROM glamping_pricing p
                 WHERE p.item_id = i.id AND p.event_id IS NULL),
                0
              ) as base_price,
              i.sku,
              i.summary
            FROM glamping_items i
            LEFT JOIN glamping_categories c ON c.id = i.category_id
            LEFT JOIN glamping_item_attributes a ON a.item_id = i.id
            WHERE i.zone_id = z.id
              AND COALESCE(a.is_active, true) = true
              AND a.default_calendar_status = 'available'
            ORDER BY i.created_at DESC
            LIMIT 3
          ) as item_data
        ) as items
      FROM glamping_zones z
      WHERE z.is_active = true
    `

    const queryParams: any[] = []
    let paramCount = 1

    // Province filter
    if (provinces.length > 0) {
      query += ` AND z.province = ANY($${paramCount}::text[])`
      queryParams.push(provinces)
      paramCount++
    }

    // Availability filter (if dates provided)
    // Filter zones that have at least one available item
    if (checkIn && checkOut) {
      query += ` AND EXISTS (
        SELECT 1 FROM glamping_items i
        LEFT JOIN glamping_item_attributes a ON a.item_id = i.id
        WHERE i.zone_id = z.id
          AND COALESCE(a.is_active, true) = true
          AND a.default_calendar_status = 'available'
          AND NOT EXISTS (
            SELECT 1 FROM glamping_booking_items bi
            INNER JOIN glamping_bookings b ON b.id = bi.booking_id
            WHERE bi.item_id = i.id
              AND b.status != 'cancelled'
              AND b.payment_status != 'expired'
              AND (
                (b.check_in_date, b.check_out_date) OVERLAPS ($${paramCount}::date, $${paramCount + 1}::date)
              )
          )
      )`
      queryParams.push(checkIn, checkOut)
      paramCount += 2
    }

    // TODO: Guest capacity filter
    // For now, we don't have guest capacity on items, so we'll skip this
    // In the future, we can add a capacity field to glamping_items or glamping_parameters

    // TODO: Feature filters
    // For now, we don't have feature templates for zones/items
    // In the future, we can create glamping_feature_templates similar to campsite_feature_templates

    // Sorting
    let orderBy = ""
    switch (sort) {
      case "price-low":
        orderBy = " ORDER BY base_price ASC NULLS LAST"
        break
      case "price-high":
        orderBy = " ORDER BY base_price DESC NULLS LAST"
        break
      case "rating":
        // TODO: Add rating field to zones
        orderBy = " ORDER BY z.is_featured DESC, z.created_at DESC"
        break
      case "distance":
        // TODO: Implement distance sorting when user location is available
        orderBy = " ORDER BY COALESCE(z.name->>'vi', z.name->>'en') ASC"
        break
      case "best-match":
      default:
        orderBy = " ORDER BY z.is_featured DESC, z.created_at DESC"
        break
    }

    query += orderBy

    // Pagination
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`
    queryParams.push(limit, offset)

    // Execute main query
    const result = await pool.query(query, queryParams)

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM glamping_zones z
      WHERE z.is_active = true
    `

    const countParams: any[] = []
    let countParamIdx = 1

    // Apply same filters to count query
    if (provinces.length > 0) {
      countQuery += ` AND z.province = ANY($${countParamIdx}::text[])`
      countParams.push(provinces)
      countParamIdx++
    }

    if (checkIn && checkOut) {
      countQuery += ` AND EXISTS (
        SELECT 1 FROM glamping_items i
        LEFT JOIN glamping_item_attributes a ON a.item_id = i.id
        WHERE i.zone_id = z.id
          AND COALESCE(a.is_active, true) = true
          AND a.default_calendar_status = 'available'
          AND NOT EXISTS (
            SELECT 1 FROM glamping_booking_items bi
            INNER JOIN glamping_bookings b ON b.id = bi.booking_id
            WHERE bi.item_id = i.id
              AND b.status != 'cancelled'
              AND b.payment_status != 'expired'
              AND (b.check_in_date, b.check_out_date) OVERLAPS ($${countParamIdx}::date, $${countParamIdx + 1}::date)
          )
      )`
      countParams.push(checkIn, checkOut)
      countParamIdx += 2
    }

    const countResult = await pool.query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].total)

    // Transform results
    const zones = result.rows.map((row) => ({
      id: row.id,
      name: row.name, // JSONB object {vi: "...", en: "..."}
      description: row.description, // JSONB object
      location: `${row.city || ''}, ${row.province || ''}`.trim().replace(/^,\s*/, ''),
      address: row.address,
      city: row.city,
      province: row.province,
      images: row.images || [row.featured_image || "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&q=80"],
      basePrice: parseFloat(row.base_price) || 0,
      features: [], // TODO: Add features when zone features are implemented
      items: row.items || [],
      distance: "", // TODO: Calculate distance from user location
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      slug: row.id, // Use zone ID directly as slug
    }))

    return NextResponse.json({
      success: true,
      data: {
        zones,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        filters: {
          checkIn,
          checkOut,
          adults,
          children,
          guests,
          provinces,
          appliedFilters: filters,
          sort,
        },
      },
    })
  } catch (error) {
    console.error("Glamping Search API Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to search glamping zones",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
