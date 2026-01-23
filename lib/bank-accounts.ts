/**
 * Bank Accounts Helper Functions
 * Handles bank account operations for multi-banking accounts feature
 */

import pool from '@/lib/db';

/**
 * Bank Account Interface
 */
export interface BankAccount {
  id: string;
  bank_name: string;
  bank_id: string;
  account_number: string;
  account_holder: string;
  is_default: boolean;
  is_active: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}


/**
 * Get bank account for a specific campsite
 * Priority: Campsite-specific account > Default account
 * @param campsiteId - Campsite UUID
 * @returns Bank account object
 * @throws Error if no default account found
 */
export async function getBankAccountForCampsite(
  campsiteId: string
): Promise<BankAccount> {
  // 1. Get campsite with bank_account_id
  const campsiteResult = await pool.query(
    `SELECT bank_account_id FROM campsites WHERE id = $1`,
    [campsiteId]
  );

  if (campsiteResult.rows.length === 0) {
    throw new Error(`Campsite not found: ${campsiteId}`);
  }

  const campsite = campsiteResult.rows[0];

  // 2. If campsite has bank_account_id, try to get that account
  if (campsite.bank_account_id) {
    const bankAccountResult = await pool.query(
      `SELECT * FROM bank_accounts
       WHERE id = $1 AND is_active = true`,
      [campsite.bank_account_id]
    );

    if (bankAccountResult.rows.length > 0) {
      return bankAccountResult.rows[0] as BankAccount;
    }

    // Log warning if account not found or inactive
    console.warn(
      `Bank account ${campsite.bank_account_id} not found or inactive for campsite ${campsiteId}. Falling back to default account.`
    );
  }

  // 3. Fallback: Get default account
  const defaultAccountResult = await pool.query(
    `SELECT * FROM bank_accounts
     WHERE is_default = true AND is_active = true
     LIMIT 1`
  );

  if (defaultAccountResult.rows.length === 0) {
    throw new Error(
      'No default bank account found. Please configure a default bank account in admin settings.'
    );
  }

  return defaultAccountResult.rows[0] as BankAccount;
}

/**
 * Get bank account by account number (for webhook matching)
 * @param accountNumber - Account number from webhook
 * @returns Bank account object or null if not found
 */
export async function getBankAccountByAccountNumber(
  accountNumber: string
): Promise<BankAccount | null> {
  const result = await pool.query(
    `SELECT * FROM bank_accounts
     WHERE account_number = $1 AND is_active = true
     LIMIT 1`,
    [accountNumber]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as BankAccount;
}

/**
 * Get default bank account
 * @returns Default bank account or null
 */
export async function getDefaultBankAccount(): Promise<BankAccount | null> {
  const result = await pool.query(
    `SELECT * FROM bank_accounts
     WHERE is_default = true AND is_active = true
     LIMIT 1`
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as BankAccount;
}

/**
 * Get bank account for a specific glamping zone
 * Priority: Zone-specific account > Default account
 * @param zoneId - Glamping zone UUID
 * @returns Bank account object
 * @throws Error if no default account found
 */
export async function getBankAccountForGlampingZone(
  zoneId: string
): Promise<BankAccount> {
  // 1. Get glamping zone with bank_account_id
  const zoneResult = await pool.query(
    `SELECT bank_account_id FROM glamping_zones WHERE id = $1`,
    [zoneId]
  );

  if (zoneResult.rows.length === 0) {
    throw new Error(`Glamping zone not found: ${zoneId}`);
  }

  const zone = zoneResult.rows[0];

  // 2. If zone has bank_account_id, try to get that account
  if (zone.bank_account_id) {
    const bankAccountResult = await pool.query(
      `SELECT * FROM bank_accounts
       WHERE id = $1 AND is_active = true`,
      [zone.bank_account_id]
    );

    if (bankAccountResult.rows.length > 0) {
      return bankAccountResult.rows[0] as BankAccount;
    }

    // Log warning if account not found or inactive
    console.warn(
      `Bank account ${zone.bank_account_id} not found or inactive for glamping zone ${zoneId}. Falling back to default account.`
    );
  }

  // 3. Fallback: Get default account
  const defaultAccountResult = await pool.query(
    `SELECT * FROM bank_accounts
     WHERE is_default = true AND is_active = true
     LIMIT 1`
  );

  if (defaultAccountResult.rows.length === 0) {
    throw new Error(
      'No default bank account found. Please configure a default bank account in admin settings.'
    );
  }

  return defaultAccountResult.rows[0] as BankAccount;
}

/**
 * Check if a bank account is being used by any campsite or glamping zone
 * @param bankAccountId - Bank account UUID
 * @returns Number of campsites and glamping zones using this account
 */
export async function getBankAccountUsageCount(
  bankAccountId: string
): Promise<number> {
  try {
    const result = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM campsites WHERE bank_account_id = $1) +
        (SELECT COUNT(*) FROM glamping_zones WHERE bank_account_id = $1) as total`,
      [bankAccountId]
    );

    return parseInt(result.rows[0].total) || 0;
  } catch (error) {
    console.error('Error getting bank account usage count:', error);
    return 0;
  }
}

/**
 * Get glamping zone usage count for a bank account
 * @param bankAccountId - Bank account UUID
 * @returns Number of glamping zones using this account
 */
export async function getGlampingZoneUsageCount(
  bankAccountId: string
): Promise<number> {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) FROM glamping_zones WHERE bank_account_id = $1`,
      [bankAccountId]
    );

    return parseInt(result.rows[0].count) || 0;
  } catch (error) {
    console.error('Error getting glamping zone usage count:', error);
    return 0;
  }
}

/**
 * Validate bank account data
 * @param data - Bank account data to validate
 * @returns Validation result
 */
export function validateBankAccountData(data: {
  bank_name?: string;
  bank_id?: string;
  account_number?: string;
  account_holder?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.bank_name && data.bank_name.length > 100) {
    errors.push('Bank name must be 100 characters or less');
  }

  if (data.bank_id) {
    if (data.bank_id.length > 20) {
      errors.push('Bank ID must be 20 characters or less');
    }
  }

  if (data.account_number) {
    if (data.account_number.length > 50) {
      errors.push('Account number must be 50 characters or less');
    }
    // Basic alphanumeric validation
    if (!/^[a-zA-Z0-9]+$/.test(data.account_number)) {
      errors.push('Account number must be alphanumeric');
    }
  }

  if (data.account_holder && data.account_holder.length > 255) {
    errors.push('Account holder name must be 255 characters or less');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
