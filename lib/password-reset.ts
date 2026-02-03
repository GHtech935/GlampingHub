/**
 * Password Reset Utility Functions
 * Handles token generation, validation, and reset logic
 */

import { v4 as uuidv4 } from 'uuid';
import { query } from './db';
import bcrypt from 'bcryptjs';

const TOKEN_EXPIRY_HOURS = 1; // Token valid for 1 hour

/**
 * Generate a new password reset token for a customer
 * Returns the token string or null if customer not found
 */
export async function generatePasswordResetToken(email: string): Promise<string | null> {
  try {
    // Check if customer exists
    const customerResult = await query(
      'SELECT id, first_name, last_name FROM customers WHERE email = $1',
      [email.toLowerCase()]
    );

    if (customerResult.rows.length === 0) {
      return null;
    }

    const customer = customerResult.rows[0];

    // Generate unique token
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

    // Save token to database
    await query(
      `UPDATE customers
       SET password_reset_token = $1,
           password_reset_token_expires = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [token, expiresAt, customer.id]
    );

    console.log(`Password reset token generated for: ${email}`);
    return token;
  } catch (error) {
    console.error('Error generating password reset token:', error);
    return null;
  }
}

/**
 * Validate a password reset token
 * Returns customer info if valid, null if invalid/expired
 */
export async function validatePasswordResetToken(token: string): Promise<{
  id: string;
  email: string;
  firstName: string;
  lastName: string;
} | null> {
  try {
    const result = await query(
      `SELECT id, email, first_name, last_name, password_reset_token_expires
       FROM customers
       WHERE password_reset_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      console.log('Password reset token not found');
      return null;
    }

    const customer = result.rows[0];

    // Check if token is expired
    const expiresAt = new Date(customer.password_reset_token_expires);
    const now = new Date();

    if (now > expiresAt) {
      console.log('Password reset token expired');
      // Clear expired token
      await clearPasswordResetToken(customer.id);
      return null;
    }

    return {
      id: customer.id,
      email: customer.email,
      firstName: customer.first_name,
      lastName: customer.last_name,
    };
  } catch (error) {
    console.error('Error validating password reset token:', error);
    return null;
  }
}

/**
 * Clear password reset token from database
 */
export async function clearPasswordResetToken(customerId: string): Promise<void> {
  try {
    await query(
      `UPDATE customers
       SET password_reset_token = NULL,
           password_reset_token_expires = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [customerId]
    );
  } catch (error) {
    console.error('Error clearing password reset token:', error);
  }
}

/**
 * Reset customer password using token
 * Returns success boolean
 */
export async function resetPassword(token: string, newPassword: string): Promise<{
  success: boolean;
  error?: string;
  customerId?: string;
}> {
  try {
    // Validate token first
    const customer = await validatePasswordResetToken(token);

    if (!customer) {
      return {
        success: false,
        error: 'Invalid or expired reset token',
      };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear token (single-use)
    await query(
      `UPDATE customers
       SET password_hash = $1,
           password_reset_token = NULL,
           password_reset_token_expires = NULL,
           updated_at = NOW()
       WHERE id = $2`,
      [hashedPassword, customer.id]
    );

    console.log(`Password reset successful for customer: ${customer.email}`);

    return {
      success: true,
      customerId: customer.id,
    };
  } catch (error: any) {
    console.error('Error resetting password:', error);
    return {
      success: false,
      error: error.message || 'Failed to reset password',
    };
  }
}

/**
 * Get customer info by reset token (for displaying name on reset page)
 */
export async function getCustomerByResetToken(token: string): Promise<{
  email: string;
  firstName: string;
  lastName: string;
} | null> {
  const customer = await validatePasswordResetToken(token);

  if (!customer) {
    return null;
  }

  return {
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
  };
}

// =============================================
// ADMIN/STAFF PASSWORD RESET FUNCTIONS
// =============================================

/**
 * Generate a new password reset token for an admin/staff user
 * Returns the token string or null if user not found
 */
export async function generateAdminPasswordResetToken(email: string): Promise<string | null> {
  try {
    // Check if admin/staff user exists
    const userResult = await query(
      'SELECT id, first_name, last_name, is_active FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return null;
    }

    const user = userResult.rows[0];

    // Check if user is active
    if (!user.is_active) {
      console.log(`Password reset attempted for inactive user: ${email}`);
      return null;
    }

    // Generate unique token
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

    // Save token to database
    await query(
      `UPDATE users
       SET password_reset_token = $1,
           password_reset_token_expires = $2
       WHERE id = $3`,
      [token, expiresAt, user.id]
    );

    console.log(`Admin password reset token generated for: ${email}`);
    return token;
  } catch (error) {
    console.error('Error generating admin password reset token:', error);
    return null;
  }
}

/**
 * Validate an admin password reset token
 * Returns user info if valid, null if invalid/expired
 */
export async function validateAdminPasswordResetToken(token: string): Promise<{
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
} | null> {
  try {
    const result = await query(
      `SELECT id, email, first_name, last_name, role, password_reset_token_expires
       FROM users
       WHERE password_reset_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      console.log('Admin password reset token not found');
      return null;
    }

    const user = result.rows[0];

    // Check if token is expired
    const expiresAt = new Date(user.password_reset_token_expires);
    const now = new Date();

    if (now > expiresAt) {
      console.log('Admin password reset token expired');
      // Clear expired token
      await clearAdminPasswordResetToken(user.id);
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
    };
  } catch (error) {
    console.error('Error validating admin password reset token:', error);
    return null;
  }
}

/**
 * Clear admin password reset token from database
 */
export async function clearAdminPasswordResetToken(userId: string): Promise<void> {
  try {
    await query(
      `UPDATE users
       SET password_reset_token = NULL,
           password_reset_token_expires = NULL
       WHERE id = $1`,
      [userId]
    );
  } catch (error) {
    console.error('Error clearing admin password reset token:', error);
  }
}

/**
 * Reset admin password using token
 * Returns success boolean
 */
export async function resetAdminPassword(token: string, newPassword: string): Promise<{
  success: boolean;
  error?: string;
  userId?: string;
}> {
  try {
    // Validate token first
    const user = await validateAdminPasswordResetToken(token);

    if (!user) {
      return {
        success: false,
        error: 'Invalid or expired reset token',
      };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear token (single-use)
    await query(
      `UPDATE users
       SET password_hash = $1,
           password_reset_token = NULL,
           password_reset_token_expires = NULL
       WHERE id = $2`,
      [hashedPassword, user.id]
    );

    console.log(`Admin password reset successful for user: ${user.email}`);

    return {
      success: true,
      userId: user.id,
    };
  } catch (error: any) {
    console.error('Error resetting admin password:', error);
    return {
      success: false,
      error: error.message || 'Failed to reset password',
    };
  }
}

/**
 * Get admin user info by reset token (for displaying name on reset page)
 */
export async function getAdminByResetToken(token: string): Promise<{
  email: string;
  firstName: string;
  lastName: string;
  role: string;
} | null> {
  const user = await validateAdminPasswordResetToken(token);

  if (!user) {
    return null;
  }

  return {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}
