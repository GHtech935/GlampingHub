import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Fetch all active glamping zones with id, name, and province
    const query = `
      SELECT id, name, province
      FROM glamping_zones
      WHERE is_active = true
      ORDER BY name->>'vi'
    `;

    const { rows: zones } = await pool.query(query);

    return NextResponse.json(zones || []);
  } catch (error) {
    console.error('Error in glamping zones API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
