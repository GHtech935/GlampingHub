/**
 * Commission Payouts - Monthly Payout Generation
 *
 * This library handles generation and management of monthly commission payouts to campsite owners.
 *
 * Business Rules:
 * - Payouts are generated monthly, aggregating all owner_earnings from bookings
 * - One payout record per owner+campsite+period (enforced by unique constraint)
 * - Only includes non-cancelled bookings with owner_earnings > 0
 * - Payout status flow: pending → processing → paid (or cancelled)
 * - Admins manually mark payouts as paid when funds are transferred
 *
 * @created 2025-12-11
 */

import { PoolClient } from 'pg';
import { getClient } from './db';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PayoutSummary {
  payout_id: string;
  owner_id: string;
  owner_name: string;
  campsite_id: string;
  campsite_name: string;
  period_month: number;
  period_year: number;
  total_bookings_count: number;
  total_paid_amount: number;
  total_commission_amount: number;
  total_owner_earnings: number;
  status: string;
  created_at: Date;
}

export interface GeneratePayoutsResult {
  generated_count: number;
  updated_count: number;
  total_owners: number;
  total_amount: number;
  payouts: PayoutSummary[];
}

// ============================================================================
// MONTHLY PAYOUT GENERATION
// ============================================================================

/**
 * Generate monthly payout records for all campsite owners
 *
 * This function should be run at the end of each month (or manually triggered by admin).
 * It aggregates all owner_earnings from bookings created in the specified month.
 *
 * Algorithm:
 * 1. Find all owners with bookings in the period (non-cancelled, owner_earnings > 0)
 * 2. For each owner+campsite combination:
 *    - Calculate total bookings count
 *    - Calculate total paid amount (deposit or full payment)
 *    - Calculate total commission (system earnings)
 *    - Calculate total owner earnings
 * 3. Insert or update payout record (upsert by unique constraint)
 * 4. Return summary of generated payouts
 *
 * @param month - Month number (1-12)
 * @param year - Year (e.g., 2025)
 * @param client - Optional PostgreSQL client for transaction support
 * @returns Summary of generated payouts
 *
 * @throws Error if month/year invalid
 * @throws Error if database operation fails
 *
 * @example
 * // Generate payouts for December 2025
 * const result = await generateMonthlyPayouts(12, 2025);
 * console.log(`Generated ${result.generated_count} new payouts`);
 * console.log(`Updated ${result.updated_count} existing payouts`);
 * console.log(`Total payout amount: ${result.total_amount}`);
 */
export async function generateMonthlyPayouts(
  month: number,
  year: number,
  client?: PoolClient
): Promise<GeneratePayoutsResult> {
  // Validate inputs
  if (month < 1 || month > 12) {
    throw new Error('Month must be between 1 and 12');
  }

  if (year < 2025) {
    throw new Error('Year must be 2025 or later');
  }

  const ownClient = client ? null : await getClient();
  const db = client || ownClient;

  if (!db) {
    throw new Error('Failed to get database client');
  }

  try {
    if (!client) {
      await db.query('BEGIN');
    }

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1); // First day of month
    const endDate = new Date(year, month, 1); // First day of next month

    console.log(`📊 Generating payouts for ${year}-${month.toString().padStart(2, '0')} (${startDate.toISOString()} to ${endDate.toISOString()})`);

    // Get all owners with bookings in this period
    // Group by owner_id + campsite_id to handle multi-campsite owners
    const ownersQuery = `
      SELECT DISTINCT
        c.owner_id,
        c.id as campsite_id,
        COALESCE(c.name->>'vi', c.name->>'en') as campsite_name,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as owner_name
      FROM campsites c
      JOIN bookings b ON b.campsite_id = c.id
      LEFT JOIN users u ON c.owner_id = u.id
      WHERE b.created_at >= $1
        AND b.created_at < $2
        AND c.owner_id IS NOT NULL
        AND b.status != 'cancelled'
        AND b.owner_earnings > 0
      ORDER BY owner_name, campsite_name
    `;

    const ownersResult = await db.query(ownersQuery, [startDate, endDate]);

    console.log(`👥 Found ${ownersResult.rows.length} owner+campsite combinations with earnings`);

    if (ownersResult.rows.length === 0) {
      if (!client) {
        await db.query('COMMIT');
      }
      return {
        generated_count: 0,
        updated_count: 0,
        total_owners: 0,
        total_amount: 0,
        payouts: []
      };
    }

    const payouts: PayoutSummary[] = [];
    let generated_count = 0;
    let updated_count = 0;
    let total_amount = 0;

    for (const owner of ownersResult.rows) {
      // Calculate aggregated totals for this owner+campsite+period
      const totalsQuery = `
        SELECT
          COUNT(*) as total_bookings_count,
          SUM(CASE
            WHEN payment_status = 'deposit_paid' THEN deposit_amount
            WHEN payment_status = 'fully_paid' THEN total_amount
            ELSE 0
          END) as total_paid_amount,
          SUM(commission_amount) as total_commission_amount,
          SUM(owner_earnings) as total_owner_earnings
        FROM bookings
        WHERE campsite_id = $1
          AND created_at >= $2
          AND created_at < $3
          AND status != 'cancelled'
      `;

      const totalsResult = await db.query(totalsQuery, [
        owner.campsite_id,
        startDate,
        endDate
      ]);

      const stats = totalsResult.rows[0];

      const bookingsCount = parseInt(stats.total_bookings_count) || 0;
      const paidAmount = parseFloat(stats.total_paid_amount) || 0;
      const commissionAmount = parseFloat(stats.total_commission_amount) || 0;
      const ownerEarnings = parseFloat(stats.total_owner_earnings) || 0;

      // Skip if no earnings (safety check)
      if (ownerEarnings <= 0) {
        console.log(`⏭️  Skipping ${owner.owner_name} - ${owner.campsite_name}: no earnings`);
        continue;
      }

      // Insert or update payout record (upsert)
      const upsertResult = await db.query(`
        INSERT INTO monthly_commission_payouts (
          owner_id,
          campsite_id,
          period_month,
          period_year,
          total_bookings_count,
          total_paid_amount,
          total_commission_amount,
          total_owner_earnings,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
        ON CONFLICT (owner_id, campsite_id, period_month, period_year)
        DO UPDATE SET
          total_bookings_count = $5,
          total_paid_amount = $6,
          total_commission_amount = $7,
          total_owner_earnings = $8,
          updated_at = NOW()
        RETURNING id, created_at = updated_at as is_new
      `, [
        owner.owner_id,
        owner.campsite_id,
        month,
        year,
        bookingsCount,
        paidAmount,
        commissionAmount,
        ownerEarnings
      ]);

      const payoutId = upsertResult.rows[0].id;
      const isNew = upsertResult.rows[0].is_new;

      if (isNew) {
        generated_count++;
        console.log(`✨ Generated new payout: ${owner.owner_name} - ${owner.campsite_name} = ${ownerEarnings.toLocaleString('vi-VN')}đ`);
      } else {
        updated_count++;
        console.log(`🔄 Updated existing payout: ${owner.owner_name} - ${owner.campsite_name} = ${ownerEarnings.toLocaleString('vi-VN')}đ`);
      }

      total_amount += ownerEarnings;

      payouts.push({
        payout_id: payoutId,
        owner_id: owner.owner_id,
        owner_name: owner.owner_name,
        campsite_id: owner.campsite_id,
        campsite_name: owner.campsite_name,
        period_month: month,
        period_year: year,
        total_bookings_count: bookingsCount,
        total_paid_amount: paidAmount,
        total_commission_amount: commissionAmount,
        total_owner_earnings: ownerEarnings,
        status: 'pending',
        created_at: new Date()
      });
    }

    if (!client) {
      await db.query('COMMIT');
    }

    console.log(`✅ Payout generation complete:`);
    console.log(`   - New payouts: ${generated_count}`);
    console.log(`   - Updated payouts: ${updated_count}`);
    console.log(`   - Total amount: ${total_amount.toLocaleString('vi-VN')}đ`);

    return {
      generated_count,
      updated_count,
      total_owners: ownersResult.rows.length,
      total_amount,
      payouts
    };
  } catch (error) {
    if (!client) {
      await db.query('ROLLBACK');
    }
    throw error;
  } finally {
    if (ownClient) {
      ownClient.release();
    }
  }
}

// ============================================================================
// PAYOUT QUERY FUNCTIONS
// ============================================================================

/**
 * Get payout record by ID
 *
 * @param payoutId - UUID of payout
 * @returns Payout record with owner and campsite details
 */
export async function getPayoutById(payoutId: string): Promise<PayoutSummary | null> {
  const client = await getClient();

  try {
    const result = await client.query(`
      SELECT
        p.id as payout_id,
        p.owner_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as owner_name,
        p.campsite_id,
        COALESCE(c.name->>'vi', c.name->>'en') as campsite_name,
        p.period_month,
        p.period_year,
        p.total_bookings_count,
        p.total_paid_amount,
        p.total_commission_amount,
        p.total_owner_earnings,
        p.status,
        p.created_at
      FROM monthly_commission_payouts p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN campsites c ON p.campsite_id = c.id
      WHERE p.id = $1
    `, [payoutId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Get all payouts for a specific owner
 *
 * @param ownerId - UUID of owner
 * @param status - Optional status filter ('pending', 'paid', etc.)
 * @returns List of payout records
 */
export async function getPayoutsByOwner(
  ownerId: string,
  status?: string
): Promise<PayoutSummary[]> {
  const client = await getClient();

  try {
    let query = `
      SELECT
        p.id as payout_id,
        p.owner_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as owner_name,
        p.campsite_id,
        COALESCE(c.name->>'vi', c.name->>'en') as campsite_name,
        p.period_month,
        p.period_year,
        p.total_bookings_count,
        p.total_paid_amount,
        p.total_commission_amount,
        p.total_owner_earnings,
        p.status,
        p.created_at
      FROM monthly_commission_payouts p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN campsites c ON p.campsite_id = c.id
      WHERE p.owner_id = $1
    `;

    const params: any[] = [ownerId];

    if (status) {
      query += ` AND p.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY p.period_year DESC, p.period_month DESC`;

    const result = await client.query(query, params);

    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Get all payouts for a specific period
 *
 * @param month - Month number (1-12)
 * @param year - Year
 * @param status - Optional status filter
 * @returns List of payout records
 */
export async function getPayoutsByPeriod(
  month: number,
  year: number,
  status?: string
): Promise<PayoutSummary[]> {
  const client = await getClient();

  try {
    let query = `
      SELECT
        p.id as payout_id,
        p.owner_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.email) as owner_name,
        p.campsite_id,
        COALESCE(c.name->>'vi', c.name->>'en') as campsite_name,
        p.period_month,
        p.period_year,
        p.total_bookings_count,
        p.total_paid_amount,
        p.total_commission_amount,
        p.total_owner_earnings,
        p.status,
        p.created_at
      FROM monthly_commission_payouts p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN campsites c ON p.campsite_id = c.id
      WHERE p.period_month = $1 AND p.period_year = $2
    `;

    const params: any[] = [month, year];

    if (status) {
      query += ` AND p.status = $3`;
      params.push(status);
    }

    query += ` ORDER BY p.total_owner_earnings DESC`;

    const result = await client.query(query, params);

    return result.rows;
  } finally {
    client.release();
  }
}

// ============================================================================
// PAYOUT STATUS MANAGEMENT
// ============================================================================

/**
 * Mark payout as paid
 *
 * Records payment details and updates status to 'paid'.
 *
 * @param payoutId - UUID of payout
 * @param paidBy - UUID of admin who marked as paid
 * @param paymentMethod - Payment method (e.g., 'bank_transfer', 'cash')
 * @param paymentReference - Transaction reference or tracking number
 * @param notes - Optional public notes visible to owner
 * @param adminNotes - Optional admin-only notes
 * @param client - Optional PostgreSQL client for transaction support
 */
export async function markPayoutAsPaid(
  payoutId: string,
  paidBy: string,
  paymentMethod: string,
  paymentReference?: string,
  notes?: string,
  adminNotes?: string,
  client?: PoolClient
): Promise<void> {
  const ownClient = client ? null : await getClient();
  const db = client || ownClient;

  if (!db) {
    throw new Error('Failed to get database client');
  }

  try {
    if (!client) {
      await db.query('BEGIN');
    }

    await db.query(`
      UPDATE monthly_commission_payouts
      SET
        status = 'paid',
        paid_at = NOW(),
        paid_by = $2,
        payment_method = $3,
        payment_reference = $4,
        notes = $5,
        admin_notes = $6,
        updated_at = NOW()
      WHERE id = $1
    `, [
      payoutId,
      paidBy,
      paymentMethod,
      paymentReference || null,
      notes || null,
      adminNotes || null
    ]);

    if (!client) {
      await db.query('COMMIT');
    }

    console.log(`✅ Payout ${payoutId} marked as paid by ${paidBy}`);
  } catch (error) {
    if (!client) {
      await db.query('ROLLBACK');
    }
    throw error;
  } finally {
    if (ownClient) {
      ownClient.release();
    }
  }
}

/**
 * Update payout status
 *
 * @param payoutId - UUID of payout
 * @param status - New status ('pending', 'processing', 'paid', 'cancelled')
 * @param client - Optional PostgreSQL client for transaction support
 */
export async function updatePayoutStatus(
  payoutId: string,
  status: 'pending' | 'processing' | 'paid' | 'cancelled',
  client?: PoolClient
): Promise<void> {
  const ownClient = client ? null : await getClient();
  const db = client || ownClient;

  if (!db) {
    throw new Error('Failed to get database client');
  }

  try {
    if (!client) {
      await db.query('BEGIN');
    }

    await db.query(`
      UPDATE monthly_commission_payouts
      SET status = $2, updated_at = NOW()
      WHERE id = $1
    `, [payoutId, status]);

    if (!client) {
      await db.query('COMMIT');
    }

    console.log(`✅ Payout ${payoutId} status updated to ${status}`);
  } catch (error) {
    if (!client) {
      await db.query('ROLLBACK');
    }
    throw error;
  } finally {
    if (ownClient) {
      ownClient.release();
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

const commissionPayouts = {
  generateMonthlyPayouts,
  getPayoutById,
  getPayoutsByOwner,
  getPayoutsByPeriod,
  markPayoutAsPaid,
  updatePayoutStatus
};

export default commissionPayouts;
