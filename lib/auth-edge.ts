// Auth utilities for Edge Runtime (middleware)
// No database imports allowed

import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-key-please-change-in-production'
);

// Staff session
export interface StaffSession {
  type: 'staff';
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'sale' | 'operations' | 'owner';

  // DEPRECATED: Kept for backward compatibility only
  // For operations role: Use campsiteIds instead
  // Will be removed in a future version
  campsiteId?: string;

  // Unified field for both operations and owner roles
  // Contains array of campsite IDs that the user has access to
  campsiteIds?: string[];
}

// Customer session
export interface CustomerSession {
  type: 'customer';
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isRegistered: boolean;
}

// Union type for all sessions
export type SessionUser = StaffSession | CustomerSession;

// Helper type guards
export function isStaffSession(session: SessionUser): session is StaffSession {
  return session.type === 'staff';
}

export function isCustomerSession(session: SessionUser): session is CustomerSession {
  return session.type === 'customer';
}

// Verify JWT token (Edge-compatible)
export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return (payload.user as SessionUser) || null;
  } catch (error) {
    return null;
  }
}

// Create JWT token (Edge-compatible)
export async function createToken(user: SessionUser): Promise<string> {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(JWT_SECRET);

  return token;
}
