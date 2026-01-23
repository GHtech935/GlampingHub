'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';

export default function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      try {
        // We'll validate the token through the reset API by checking if it exists
        // For now, just assume it's valid and let the API handle validation
        setTokenValid(true);
      } catch (error) {
        setTokenValid(false);
        toast.error('Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
      } finally {
        setValidatingToken(false);
      }
    };

    validateToken();
  }, [token]);

  // Countdown and redirect after successful reset
  useEffect(() => {
    if (resetSuccess && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (resetSuccess && countdown === 0) {
      router.push('/');
    }
  }, [resetSuccess, countdown, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted!', { password: password.length, confirmPassword: confirmPassword.length });

    // Clear previous errors
    setPasswordError('');
    setConfirmPasswordError('');

    // Validate password strength
    if (!password || password.length < 8) {
      const error = 'Mật khẩu phải có ít nhất 8 ký tự';
      setPasswordError(error);
      toast.error(error);
      console.log('Validation failed: password too short');
      return;
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d)/.test(password)) {
      const error = 'Mật khẩu phải chứa ít nhất 1 chữ cái và 1 số';
      setPasswordError(error);
      toast.error(error);
      console.log('Validation failed: password missing letter or number');
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      const error = 'Mật khẩu xác nhận không khớp';
      setConfirmPasswordError(error);
      toast.error(error);
      console.log('Validation failed: passwords do not match');
      return;
    }

    console.log('All validations passed, submitting to API...');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();
      console.log('API Response:', { status: response.status, data });

      if (!response.ok) {
        throw new Error(data.error || 'Không thể đặt lại mật khẩu');
      }

      console.log('Password reset successful!');
      toast.success('Đặt lại mật khẩu thành công!');
      setResetSuccess(true);
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error(error.message);
      if (error.message.includes('Invalid or expired')) {
        setTokenValid(false);
      }
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (validatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Đang xác thực link...</p>
        </div>
      </div>
    );
  }

  // Invalid token
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <AlertCircle className="h-10 w-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
              Link không hợp lệ
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-900 font-medium mb-2">
              Có thể do:
            </p>
            <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
              <li>Link đã hết hạn (chỉ có hiệu lực trong 1 giờ)</li>
              <li>Link đã được sử dụng</li>
              <li>Link không chính xác</li>
            </ul>
          </div>

          <Link
            href="/forgot-password"
            className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition"
          >
            Yêu cầu link mới
          </Link>

          <div className="mt-4 text-center">
            <Link href="/login" className="text-sm text-primary hover:underline">
              Quay lại đăng nhập
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
              Đặt lại mật khẩu thành công!
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Mật khẩu của bạn đã được cập nhật. Bạn đã được đăng nhập tự động.
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center mb-6">
            <p className="text-lg text-green-900 font-medium mb-2">
              Đang chuyển hướng trong {countdown} giây...
            </p>
            <div className="w-full bg-green-200 rounded-full h-2 mt-3">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${((3 - countdown) / 3) * 100}%` }}
              ></div>
            </div>
          </div>

          <button
            onClick={() => router.push('/')}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition"
          >
            Về trang chủ ngay
          </button>
        </div>
      </div>
    );
  }

  // Reset password form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo & Header */}
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-gray-900">
            Tạo mật khẩu mới
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Nhập mật khẩu mới cho tài khoản của bạn
          </p>
        </div>

        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900 font-medium mb-2">
            Yêu cầu mật khẩu:
          </p>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>Ít nhất 8 ký tự</li>
            <li>Chứa ít nhất 1 chữ cái</li>
            <li>Chứa ít nhất 1 số</li>
          </ul>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu mới
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition ${
                  passwordError ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Nhập mật khẩu mới"
              />
            </div>
            {passwordError && (
              <p className="mt-1 text-sm text-red-600">{passwordError}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Xác nhận mật khẩu
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setConfirmPasswordError('');
                }}
                className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition ${
                  confirmPasswordError ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>
            {confirmPasswordError && (
              <p className="mt-1 text-sm text-red-600">{confirmPasswordError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
          </button>
        </form>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-primary hover:underline">
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
