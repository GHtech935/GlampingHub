'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { LoginForm } from './LoginForm';

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function LoginModal({ open, onOpenChange, onSuccess }: LoginModalProps) {
  const handleSuccess = () => {
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">Đăng nhập</DialogTitle>
          <DialogDescription className="text-center">
            Đăng nhập để lưu địa điểm yêu thích
          </DialogDescription>
        </DialogHeader>
        <LoginForm
          onSuccess={handleSuccess}
          showGuestCheckout={false}
          showHeader={false}
        />
      </DialogContent>
    </Dialog>
  );
}
