'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SessionUser } from '@/lib/auth';

export function useAuth() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchUser();
  }, []);

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

  const logout = async () => {
    try {
      // Determine redirect based on user type
      const isStaff = user?.type === 'staff';

      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);

      // Redirect to appropriate login page
      router.push(isStaff ? '/login-admin' : '/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Helper to check if user is staff
  const isStaff = user?.type === 'staff';

  // Helper to check if user is admin
  const isAdmin = isStaff && user?.type === 'staff' && ['admin', 'sale', 'operations'].includes((user as any).role);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    isStaff,
    isAdmin,
    isCustomer: user?.type === 'customer',
    logout,
    refetch: fetchUser,
  };
}
