'use client';

import { useTranslations } from 'next-intl';
import { Loader2, Bell } from 'lucide-react';
import NotificationItem from './NotificationItem';
import { Notification } from '@/hooks/useNotifications';

interface NotificationListProps {
  notifications: Notification[];
  isLoading: boolean;
  appType?: 'camping' | 'glamping';
  onClose: () => void;
}

/**
 * List of notifications with loading and empty states
 */
export default function NotificationList({
  notifications,
  isLoading,
  appType = 'camping',
  onClose,
}: NotificationListProps) {
  const t = useTranslations('notifications');

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  // Empty state
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-muted p-4">
          <Bell className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{t('empty')}</p>
      </div>
    );
  }

  // Notification list
  return (
    <div className="space-y-1.5 pb-4">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          appType={appType}
          onClose={onClose}
        />
      ))}
    </div>
  );
}
