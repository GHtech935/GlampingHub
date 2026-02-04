'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { SessionUser } from '@/lib/auth';

interface AuthContextType {
  user: SessionUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  isCustomer: boolean;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user || data.customer);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const logout = async () => {
    try {
      const isStaff = user?.type === 'staff';
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push(isStaff ? '/login-admin' : '/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isStaff = user?.type === 'staff';
  const isAdmin = isStaff && user?.type === 'staff' && ['admin', 'sale', 'operations'].includes((user as any).role);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isStaff,
    isAdmin,
    isCustomer: user?.type === 'customer',
    logout,
    refetch: fetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
