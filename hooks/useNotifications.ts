'use client';

import { useState, useCallback, useEffect } from 'react';

/**
 * Notification interface matching backend response
 */
export interface Notification {
  id: string;
  user_id: string;
  user_type: 'customer' | 'staff';
  type: string;
  title: { vi: string; en: string };
  message: { vi: string; en: string };
  data?: Record<string, any>;
  link: string;
  is_read: boolean;
  send_email: boolean;
  created_at: string;
}

interface UseNotificationsOptions {
  autoFetchCount?: boolean; // Auto fetch unread count on mount
}

/**
 * Custom hook for managing notifications
 *
 * Usage:
 * ```tsx
 * const {
 *   notifications,
 *   unreadCount,
 *   isLoading,
 *   fetchNotifications,
 *   markAsReadById,
 *   markAllAsRead,
 *   refetch
 * } = useNotifications();
 * ```
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const { autoFetchCount = true } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch just the unread count (for badge display)
   */
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/unread-count');
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count);
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, []);

  /**
   * Fetch notifications with optional filtering
   */
  const fetchNotifications = useCallback(
    async (unreadOnly = false, limit = 50) => {
      setIsLoading(true);
      setError(null);

      try {
        const url = `/api/notifications?limit=${limit}&unread_only=${unreadOnly}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('Failed to fetch notifications');
        }

        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count);
      } catch (err) {
        console.error('Error fetching notifications:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Mark a single notification as read
   */
  const markAsReadById = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
      });

      if (response.ok) {
        // Update local state
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error marking as read:', err);
      return false;
    }
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });

      if (response.ok) {
        // Update local state
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error marking all as read:', err);
      return false;
    }
  }, []);

  /**
   * Delete a notification
   */
  const deleteById = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Find the notification to check if it was unread
        const notification = notifications.find((n) => n.id === id);

        // Update local state
        setNotifications((prev) => prev.filter((n) => n.id !== id));

        // Update unread count if the deleted notification was unread
        if (notification && !notification.is_read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }

        return true;
      }
      return false;
    } catch (err) {
      console.error('Error deleting notification:', err);
      return false;
    }
  }, [notifications]);

  /**
   * Refetch both notifications and count
   */
  const refetch = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Auto fetch unread count on mount if enabled
  useEffect(() => {
    if (autoFetchCount) {
      fetchUnreadCount();
    }
  }, [autoFetchCount, fetchUnreadCount]);

  return {
    // State
    notifications,
    unreadCount,
    isLoading,
    error,

    // Actions
    fetchNotifications,
    fetchUnreadCount,
    markAsReadById,
    markAllAsRead,
    deleteById,
    refetch,
  };
}

export default useNotifications;
