'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNotifications, Notification } from '@/hooks/useNotifications';

interface NotificationItemProps {
  notification: Notification;
  appType?: 'camping' | 'glamping';
  onClose: () => void;
}

/**
 * Individual notification item with click handling
 */
export default function NotificationItem({
  notification,
  appType = 'camping',
  onClose,
}: NotificationItemProps) {
  const router = useRouter();
  const locale = useLocale();
  const { markAsReadById } = useNotifications({
    autoFetchCount: false,
    appType,
  });

  // Get localized title and message
  const title =
    notification.title[locale as 'vi' | 'en'] || notification.title.vi;
  const message =
    notification.message[locale as 'vi' | 'en'] || notification.message.vi;

  // Format time ago
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: locale === 'vi' ? vi : enUS,
  });

  const handleClick = async () => {
    // Mark as read if not already
    if (!notification.is_read) {
      await markAsReadById(notification.id);
    }

    // Navigate to link if provided
    if (notification.link) {
      router.push(notification.link);
    }

    // Close the panel
    onClose();
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'p-2 rounded-lg border cursor-pointer transition-colors hover:bg-accent',
        !notification.is_read && 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      <div className="flex items-start gap-2">
        {/* Unread indicator */}
        <div className="flex-shrink-0 pt-0.5">
          {!notification.is_read && (
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
          )}
          {notification.is_read && <div className="w-2 h-2" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4
            className={cn(
              'text-xs leading-tight',
              !notification.is_read ? 'font-semibold' : 'font-medium'
            )}
          >
            {title}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed break-words">
            {message}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">{timeAgo}</p>
        </div>
      </div>
    </div>
  );
}
