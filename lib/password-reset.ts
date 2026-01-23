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
