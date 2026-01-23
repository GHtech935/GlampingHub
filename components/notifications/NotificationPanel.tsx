'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import NotificationList from './NotificationList';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userType: 'customer' | 'staff';
  appType?: 'camping' | 'glamping';
}

/**
 * Notification panel (Sheet) that shows all notifications
 */
export default function NotificationPanel({
  isOpen,
  onClose,
  userType,
  appType = 'camping',
}: NotificationPanelProps) {
  const t = useTranslations('notifications');
  const { markAllAsRead, fetchNotifications, unreadCount } = useNotifications({
    autoFetchCount: false,
    appType,
  });

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    fetchNotifications();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:w-[400px] flex flex-col">
        <SheetHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <div>
            <SheetTitle>{t('title')}</SheetTitle>
            <SheetDescription className="sr-only">
              {t('title')}
            </SheetDescription>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-xs"
            >
              {t('markAllRead')}
            </Button>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-4 -mx-6 px-6">
          <NotificationList userType={userType} appType={appType} onClose={onClose} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
