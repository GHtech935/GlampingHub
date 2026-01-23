import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.type !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { parameters } = body; // Array of { id, display_order }

    if (!Array.isArray(parameters) || parameters.length === 0) {
      return NextResponse.json({ error: 'Parameters array is required' }, { status: 400 });
    }

    // Start transaction
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update display_order for each parameter
      for (const param of parameters) {
        await client.query(
          'UPDATE glamping_parameters SET display_order = $1, updated_at = NOW() WHERE id = $2',
          [param.display_order, param.id]
        );
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Display order updated successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Parameters reorder error:', error);
    return NextResponse.json({ error: 'Failed to reorder parameters' }, { status: 500 });
  }
}
