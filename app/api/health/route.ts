import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    // Test database connection
    const result = await pool.query('SELECT NOW() as time, version() as version');

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        time: result.rows[0].time,
        version: result.rows[0].version,
      },
      environment: process.env.NODE_ENV,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: {
          connected: false,
          error: error.message,
        },
        environment: process.env.NODE_ENV,
      },
      { status: 500 }
    );
  }
}
