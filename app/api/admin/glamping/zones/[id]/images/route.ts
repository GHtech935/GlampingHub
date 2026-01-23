import { NextRequest, NextResponse } from 'next/server';
import pool, { getClient } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET - Get all images for a zone
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: zoneId } = await params;

    const query = `
      SELECT *
      FROM glamping_zone_images
      WHERE zone_id = $1
      ORDER BY display_order ASC, created_at ASC
    `;

    const { rows } = await pool.query(query, [zoneId]);

    return NextResponse.json({ images: rows });
  } catch (error) {
    console.error('Error fetching zone images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}

// POST - Add new image to zone
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role check
    if (!['admin', 'owner'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: zoneId } = await params;
    const body = await req.json();
    const { image_url, public_id, is_featured, display_order } = body;

    if (!image_url) {
      return NextResponse.json(
        { error: 'image_url is required' },
        { status: 400 }
      );
    }

    // Check image count limit (max 10)
    const countQuery = `
      SELECT COUNT(*) as count
      FROM glamping_zone_images
      WHERE zone_id = $1
    `;

    const { rows: countRows } = await pool.query(countQuery, [zoneId]);
    const currentCount = parseInt(countRows[0].count);

    if (currentCount >= 10) {
      return NextResponse.json(
        { error: 'Maximum 10 images per zone' },
        { status: 400 }
      );
    }

    // If no display_order provided, use next available
    let finalDisplayOrder = display_order;
    if (finalDisplayOrder === undefined || finalDisplayOrder === null) {
      finalDisplayOrder = currentCount;
    }

    // Insert image
    const insertQuery = `
      INSERT INTO glamping_zone_images (
        zone_id,
        image_url,
        public_id,
        is_featured,
        display_order
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const { rows } = await pool.query(insertQuery, [
      zoneId,
      image_url,
      public_id || null,
      is_featured !== undefined ? is_featured : false,
      finalDisplayOrder,
    ]);

    return NextResponse.json({ success: true, image: rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding zone image:', error);

    // Handle unique constraint violation for featured image
    if (error.code === '23505' && error.constraint === 'idx_glamping_zone_images_featured_unique') {
      return NextResponse.json(
        { error: 'Zone already has a featured image. Remove featured status from other images first.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add image' },
      { status: 500 }
    );
  }
}

// PUT - Update image (display_order, is_featured)
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role check
    if (!['admin', 'owner'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { image_id, is_featured, display_order } = body;

    if (!image_id) {
      return NextResponse.json(
        { error: 'image_id is required' },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (is_featured !== undefined) {
      updates.push(`is_featured = $${paramIndex}`);
      values.push(is_featured);
      paramIndex++;
    }

    if (display_order !== undefined) {
      updates.push(`display_order = $${paramIndex}`);
      values.push(display_order);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = NOW()`);
    values.push(image_id);

    const updateQuery = `
      UPDATE glamping_zone_images
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const { rows } = await pool.query(updateQuery, values);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, image: rows[0] });
  } catch (error: any) {
    console.error('Error updating zone image:', error);

    // Handle unique constraint violation
    if (error.code === '23505' && error.constraint === 'idx_glamping_zone_images_featured_unique') {
      return NextResponse.json(
        { error: 'Zone already has a featured image. Remove featured status from other images first.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update image' },
      { status: 500 }
    );
  }
}

// DELETE - Delete image(s)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role check
    if (!['admin', 'owner'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: zoneId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const imageId = searchParams.get('image_id');
    const deleteAll = searchParams.get('all') === 'true';

    // Delete all images for zone
    if (deleteAll) {
      const deleteQuery = 'DELETE FROM glamping_zone_images WHERE zone_id = $1';
      await pool.query(deleteQuery, [zoneId]);

      return NextResponse.json({
        success: true,
        message: 'All images deleted successfully',
      });
    }

    // Delete single image
    if (!imageId) {
      return NextResponse.json(
        { error: 'image_id is required when not deleting all' },
        { status: 400 }
      );
    }

    // Get image info before deleting (for Cloudinary cleanup)
    const getQuery = 'SELECT * FROM glamping_zone_images WHERE id = $1 AND zone_id = $2';
    const { rows: imageRows } = await pool.query(getQuery, [imageId, zoneId]);

    if (imageRows.length === 0) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const image = imageRows[0];

    // Delete from database
    const deleteQuery = 'DELETE FROM glamping_zone_images WHERE id = $1';
    await pool.query(deleteQuery, [imageId]);

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully',
      public_id: image.public_id, // Return for Cloudinary cleanup
    });
  } catch (error) {
    console.error('Error deleting zone image:', error);
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}
