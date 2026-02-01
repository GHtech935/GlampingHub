'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { ShoppingBag, Mail, Lock, Info } from 'lucide-react';

interface LoginFormProps {
  onSuccess?: () => void;
  showGuestCheckout?: boolean;
  showHeader?: boolean;
  returnUrl?: string;
}

export function LoginForm({
  onSuccess,
  showGuestCheckout = true,
  showHeader = true,
  returnUrl = '/',
}: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'facebook' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Đăng nhập thất bại');
      }

      toast.success(`Chào mừng trở lại, ${data.customer.firstName || 'bạn'}!`);

      if (onSuccess) {
        onSuccess();
      } else {
        // Use window.location to force a full page reload so auth state is refreshed
        window.location.href = returnUrl;
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: 'google' | 'facebook') => {
    try {
      setOauthLoading(provider);
      const params = new URLSearchParams();
      if (returnUrl) {
        params.set('returnUrl', returnUrl);
      }
      const query = params.toString();
      window.location.href = `/api/auth/customer/oauth/${provider}/start${
        query ? `?${query}` : ''
      }`;
    } catch (error) {
      console.error('Social login redirection error:', error);
      setOauthLoading(null);
      toast.error('Không thể chuyển tới trang đăng nhập mạng xã hội.');
    }
  };

  return (
    <div className="w-full space-y-8">
      {/* Logo & Header */}
      {showHeader && (
        <div className="text-center">
         
          <h2 className="text-2xl font-extrabold text-gray-900">
            Đăng nhập tài khoản
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Hoặc{' '}
            <Link
              href="/register"
              className="font-medium text-primary hover:text-primary/90"
            >
              tạo tài khoản mới
            </Link>
          </p>
        </div>
      )}

      {/* Info Banner */}
      {showGuestCheckout && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 font-medium">
                Đặt chỗ không cần đăng nhập
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Bạn có thể{' '}
                <Link href="/search" className="underline font-medium">
                  đặt chỗ ngay
                </Link>{' '}
                mà không cần tạo tài khoản. Đăng nhập để xem lịch sử booking và quản lý thông tin.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3 mt-6">
        <button
          type="button"
          onClick={() => handleSocialLogin('google')}
          disabled={oauthLoading !== null}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-800 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-60 transition"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#4285F4]/10 text-xs font-semibold text-[#4285F4]">
            G
          </span>
          {oauthLoading === 'google' ? 'Đang chuyển đến Google...' : 'Đăng nhập với Google'}
        </button>
        <button
          type="button"
          onClick={() => handleSocialLogin('facebook')}
          disabled={oauthLoading !== null}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-800 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-60 transition"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1877F2]/10 text-xs font-semibold text-[#1877F2]">
            f
          </span>
          {oauthLoading === 'facebook'
            ? 'Đang chuyển đến Facebook...'
            : 'Đăng nhập với Facebook'}
        </button>
      </div>

      <div className="flex items-center gap-3 text-sm text-gray-500 mt-4">
        <div className="flex-1 border-t border-gray-200" />
        <span>Hoặc đăng nhập bằng email</span>
        <div className="flex-1 border-t border-gray-200" />
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                placeholder="your@email.com"
              />
            </div>
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                placeholder="Nhập mật khẩu"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <label
              htmlFor="remember-me"
              className="ml-2 block text-sm text-gray-900"
            >
              Ghi nhớ đăng nhập
            </label>
          </div>

          <div className="text-sm">
            <Link
              href="/forgot-password"
              className="font-medium text-green-600 hover:text-green-500"
            >
              Quên mật khẩu?
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>

          {/* Guest Checkout Button */}
          {showGuestCheckout && (
            <Link
              href="/search"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition"
            >
              <ShoppingBag className="w-4 h-4" />
              Đặt chỗ không cần đăng nhập
            </Link>
          )}
        </div>
      </form>

    </div>
  );
}
