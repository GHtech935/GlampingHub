import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import pool, { tableExists } from './db';
import {
  createToken,
  verifyToken,
  SessionUser,
  StaffSession,
  CustomerSession,
  isStaffSession,
  isCustomerSession
} from './auth-edge';

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'glampinghub_session';

// Re-export types and edge functions
export type { SessionUser, StaffSession, CustomerSession };
export { createToken, verifyToken, isStaffSession, isCustomerSession };

export interface OAuthCustomerProfile {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  emailVerified?: boolean;
  provider?: string;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Get session from cookies (server-side)
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  return verifyToken(token);
}

// Set session cookie
export async function setSession(user: SessionUser): Promise<void> {
  const token = await createToken(user);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

// Clear session cookie
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// Authenticate admin/staff user (login)
export async function authenticateAdmin(
  email: string,
  password: string
): Promise<StaffSession | null> {
  try {
    // Check users table (staff with passwords)
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, password_hash, role, campsite_id FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return null;
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Log login attempt
    await pool.query(
      `INSERT INTO login_history (user_id, email, status)
       VALUES ($1, $2, 'success')`,
      [user.id, user.email]
    );

    // For operations and owner roles, fetch their campsites from junction table (if it exists)
    let campsiteIds: string[] | undefined;
    if (user.role === 'operations' || user.role === 'owner') {
      try {
        const hasJunctionTable = await tableExists('user_campsites');
        if (hasJunctionTable) {
          const campsitesResult = await pool.query(
            'SELECT campsite_id FROM user_campsites WHERE user_id = $1 AND role = $2 ORDER BY assigned_at',
            [user.id, user.role]
          );
          campsiteIds = campsitesResult.rows.map(row => row.campsite_id);
        }

        if ((!campsiteIds || campsiteIds.length === 0) && user.role === 'owner') {
          // Fallback: owner assignments stored on campsites.owner_id
          const campsitesResult = await pool.query(
            'SELECT id FROM campsites WHERE owner_id = $1 ORDER BY created_at DESC',
            [user.id]
          );
          campsiteIds = campsitesResult.rows.map(row => row.id);
        }

        if ((!campsiteIds || campsiteIds.length === 0) && user.role === 'operations' && user.campsite_id) {
          campsiteIds = [user.campsite_id];
        }
      } catch (error) {
        console.error('Failed to fetch campsite assignments:', error);
        if (user.role === 'operations' && user.campsite_id) {
          campsiteIds = [user.campsite_id];
        }
      }
    }

    return {
      type: 'staff',
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role as 'admin' | 'sale' | 'operations' | 'owner',
      // Backward compatibility: set campsiteId to first campsite for operations
      campsiteId: (user.role === 'operations' && campsiteIds && campsiteIds.length > 0)
        ? campsiteIds[0]
        : user.campsite_id,
      campsiteIds, // Populated for both operations and owner roles
    };
  } catch (error) {
    console.error('Admin authentication error:', error);
    return null;
  }
}

// Authenticate customer (login)
export async function authenticateCustomer(
  email: string,
  password: string
): Promise<CustomerSession | null> {
  try {
    // Check customers table (only registered customers with password)
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, password_hash, is_registered
       FROM customers
       WHERE email = $1 AND password_hash IS NOT NULL`,
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const customer = result.rows[0];

    // Verify password
    const isValid = await verifyPassword(password, customer.password_hash);
    if (!isValid) {
      return null;
    }

    // Update last login
    await pool.query(
      'UPDATE customers SET last_login_at = NOW() WHERE id = $1',
      [customer.id]
    );

    // Log login attempt
    // TODO: Add customer_id column to login_history table
    // await pool.query(
    //   `INSERT INTO login_history (user_id, email, status, ip_address)
    //    VALUES (NULL, $1, 'success', $2)`,
    //   [customer.email, 'system']
    // );

    return {
      type: 'customer',
      id: customer.id,
      email: customer.email,
      firstName: customer.first_name,
      lastName: customer.last_name,
      isRegistered: customer.is_registered,
    };
  } catch (error) {
    console.error('Customer authentication error:', error);
    return null;
  }
}

// Backward compatibility - use authenticateAdmin
export async function authenticateUser(
  email: string,
  password: string
): Promise<SessionUser | null> {
  return authenticateAdmin(email, password);
}

// Create or get customer (for booking flow - guest checkout)
export async function createOrGetCustomer(data: {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
}): Promise<{ id: string; email: string } | null> {
  try {
    // Check if customer exists
    const existingCustomer = await pool.query(
      'SELECT id, email FROM customers WHERE email = $1',
      [data.email]
    );

    if (existingCustomer.rows.length > 0) {
      // Update customer info if provided
      if (data.firstName || data.lastName || data.phone) {
        await pool.query(
          `UPDATE customers
           SET first_name = COALESCE($2, first_name),
               last_name = COALESCE($3, last_name),
               phone = COALESCE($4, phone),
               country = COALESCE($5, country),
               updated_at = NOW()
           WHERE email = $1`,
          [data.email, data.firstName, data.lastName, data.phone, data.country]
        );
      }
      return existingCustomer.rows[0];
    }

    // Create new customer (guest - no password)
    const result = await pool.query(
      `INSERT INTO customers (email, first_name, last_name, phone, country, is_registered, email_verified)
       VALUES ($1, $2, $3, $4, $5, false, false)
       RETURNING id, email`,
      [data.email, data.firstName, data.lastName, data.phone, data.country || 'Vietnam']
    );

    return result.rows[0];
  } catch (error) {
    console.error('Create/get customer error:', error);
    return null;
  }
}

export async function createOrUpdateCustomerFromOAuth(
  profile: OAuthCustomerProfile
): Promise<CustomerSession> {
  try {
    const normalizedEmail = profile.email.trim().toLowerCase();
    const { rows } = await pool.query(
      `INSERT INTO customers (
        email,
        first_name,
        last_name,
        email_verified,
        is_registered,
        created_at,
        updated_at,
        last_login_at
      )
      VALUES ($1, $2, $3, $4, true, NOW(), NOW(), NOW())
      ON CONFLICT (email) DO UPDATE
      SET first_name = COALESCE(EXCLUDED.first_name, customers.first_name),
          last_name = COALESCE(EXCLUDED.last_name, customers.last_name),
          email_verified = customers.email_verified OR EXCLUDED.email_verified,
          is_registered = true,
          updated_at = NOW(),
          last_login_at = NOW()
      RETURNING id, email, first_name, last_name, is_registered`,
      [
        normalizedEmail,
        profile.firstName ?? null,
        profile.lastName ?? null,
        profile.emailVerified ?? false,
      ]
    );

    const customer = rows[0];

    // Note: login_history is only for staff/admin logins, not for customers
    // Customer login tracking can be added via a separate customer_login_history table if needed

    return {
      type: 'customer',
      id: customer.id,
      email: customer.email,
      firstName: customer.first_name,
      lastName: customer.last_name,
      isRegistered: true,
    };
  } catch (error) {
    console.error('OAuth customer upsert error:', error);
    throw error;
  }
}

// Register customer with password
export async function registerCustomer(data: {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  phone?: string;
}): Promise<CustomerSession | null> {
  try {
    const passwordHash = await hashPassword(data.password);

    // Check if customer already exists
    const existingCustomer = await pool.query(
      'SELECT id, password_hash FROM customers WHERE email = $1',
      [data.email]
    );

    let customerId: string;

    if (existingCustomer.rows.length > 0) {
      const existing = existingCustomer.rows[0];

      // If already has password, email is already registered
      if (existing.password_hash) {
        throw new Error('Email already registered');
      }

      // Guest customer exists - upgrade to registered
      await pool.query(
        `UPDATE customers
         SET password_hash = $2,
             is_registered = true,
             first_name = $3,
             last_name = $4,
             phone = $5,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id`,
        [existing.id, passwordHash, data.firstName, data.lastName, data.phone]
      );

      customerId = existing.id;
    } else {
      // Create new registered customer
      const result = await pool.query(
        `INSERT INTO customers (email, password_hash, first_name, last_name, phone, is_registered, email_verified)
         VALUES ($1, $2, $3, $4, $5, true, false)
         RETURNING id`,
        [data.email, passwordHash, data.firstName, data.lastName, data.phone]
      );

      customerId = result.rows[0].id;
    }

    // Return customer session
    return {
      type: 'customer',
      id: customerId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      isRegistered: true,
    };
  } catch (error) {
    console.error('Register customer error:', error);
    return null;
  }
}

// Create new staff user
export async function createStaffUser(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'admin' | 'sale' | 'operations' | 'owner';
  campsiteId?: string;
  campsiteIds?: string[]; // For owner role - campsites this owner will own
  phone?: string;
  notes?: string;
}): Promise<{ id: string; email: string } | null> {
  try {
    const passwordHash = await hashPassword(data.password);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, campsite_id, phone, notes, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
       RETURNING id, email`,
      [
        data.email,
        passwordHash,
        data.firstName,
        data.lastName,
        data.role || 'operations',
        data.campsiteId || null,
        data.phone || null,
        data.notes || null,
      ]
    );

    const newUser = result.rows[0];

    // For owner role, update campsites to set this user as owner
    if (data.role === 'owner' && data.campsiteIds && data.campsiteIds.length > 0) {
      await pool.query(
        'UPDATE campsites SET owner_id = $1 WHERE id = ANY($2::uuid[])',
        [newUser.id, data.campsiteIds]
      );
    }

    return newUser;
  } catch (error) {
    console.error('Create staff user error:', error);
    return null;
  }
}

// Check if user has permission
export function hasPermission(
  user: SessionUser | null,
  requiredRole: StaffSession['role'] | StaffSession['role'][]
): boolean {
  if (!user || !isStaffSession(user)) return false;

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

  // Admin has all permissions
  if (user.role === 'admin') return true;

  return roles.includes(user.role);
}

// Check if user can access campsite
export function canAccessCampsite(
  user: SessionUser | null,
  campsiteId: string
): boolean {
  if (!user || !isStaffSession(user)) return false;

  // Admin can access all
  if (user.role === 'admin') return true;

  // Sale role can access all campsites
  if (user.role === 'sale') return true;

  // Operations and Owner - check campsiteIds array first
  if (user.role === 'operations' || user.role === 'owner') {
    // Check campsiteIds array (primary method)
    if (user.campsiteIds?.includes(campsiteId)) {
      return true;
    }

    // FALLBACK for backward compatibility: check campsiteId for operations
    if (user.role === 'operations' && user.campsiteId === campsiteId) {
      return true;
    }
  }

  return false;
}

// Get accessible campsite IDs for filtering
// Returns null if user has access to ALL campsites (admin, sale)
// Returns array of campsite IDs if user has restricted access (operations, owner)
// Returns empty array if no access
export function getAccessibleCampsiteIds(user: SessionUser | null): string[] | null {
  if (!user || !isStaffSession(user)) return [];

  // Admin and Sale can access all (return null to indicate no filtering needed)
  if (user.role === 'admin' || user.role === 'sale') return null;

  // Operations and Owner - use campsiteIds array (primary method)
  if ((user.role === 'operations' || user.role === 'owner') && user.campsiteIds) {
    return user.campsiteIds;
  }

  // FALLBACK for backward compatibility: if campsiteIds is not set, try campsiteId for operations
  if (user.role === 'operations' && user.campsiteId) {
    return [user.campsiteId];
  }

  return [];
}
