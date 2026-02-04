import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') });

import pool from '@/lib/db';
import { recalculateGlampingBookingTotals } from '@/lib/booking-recalculate';

async function fixBalanceDue() {
  const client = await pool.connect();
  try {
    // Get all glamping bookings
    const result = await client.query(
      `SELECT id, booking_code FROM glamping_bookings ORDER BY created_at DESC`
    );

    console.log(`Found ${result.rows.length} bookings to recalculate...`);

    let fixed = 0;
    let errors = 0;

    for (const booking of result.rows) {
      try {
        await recalculateGlampingBookingTotals(client, booking.id);
        fixed++;
        console.log(`✓ Fixed ${booking.booking_code} (${fixed}/${result.rows.length})`);
      } catch (error) {
        errors++;
        console.error(`✗ Error fixing ${booking.booking_code}:`, error);
      }
    }

    console.log(`\nCompleted: ${fixed} fixed, ${errors} errors`);
  } finally {
    client.release();
  }
}

fixBalanceDue()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
