'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import NotificationPanel from './NotificationPanel';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationBellProps {
  userType: 'customer' | 'staff';
  className?: string;
}

/**
 * Bell icon with unread badge that opens notification panel
 *
 * Usage:
 * ```tsx
 * <NotificationBell userType="customer" />
 * <NotificationBell userType="staff" />
 * ```
 */
export default function NotificationBell({
  userType,
  className,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount, fetchNotifications, fetchUnreadCount } = useNotifications({
    autoFetchCount: true,
  });

  const handleClick = () => {
    setIsOpen(true);
    // Fetch fresh notifications when opening panel
    fetchNotifications();
  };

  const handleClose = () => {
    setIsOpen(false);
    // Refresh count when closing in case notifications were marked as read
    fetchUnreadCount();
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={`relative ${className || ''}`}
        onClick={handleClick}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs font-medium"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      <NotificationPanel
        isOpen={isOpen}
        onClose={handleClose}
        userType={userType}
      />
    </>
  );
}
