"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";

export default function AdminResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const token = params.token as string;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [userInfo, setUserInfo] = useState<{ firstName: string; lastName: string; email: string } | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await fetch(`/api/auth/admin/validate-reset-token?token=${token}`);
        const data = await response.json();

        if (response.ok && data.valid) {
          setIsValid(true);
          setUserInfo(data.user);
        } else {
          setIsValid(false);
        }
      } catch (error) {
        setIsValid(false);
      } finally {
        setIsValidating(false);
      }
    };

    if (token) {
      validateToken();
    } else {
      setIsValidating(false);
      setIsValid(false);
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords
    if (password.length < 8) {
      toast({
        title: "Lỗi",
        description: "Mật khẩu phải có ít nhất 8 ký tự",
        variant: "destructive",
      });
      return;
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d)/.test(password)) {
      toast({
        title: "Lỗi",
        description: "Mật khẩu phải chứa ít nhất một chữ cái và một số",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Lỗi",
        description: "Mật khẩu xác nhận không khớp",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Không thể đặt lại mật khẩu");
      }

      setIsSuccess(true);
      toast({
        title: "Thành công",
        description: "Mật khẩu đã được đặt lại thành công!",
      });

      // Redirect to admin after 2 seconds
      setTimeout(() => {
        router.push("/admin");
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-gray-600">Đang kiểm tra link đặt lại mật khẩu...</p>
          </div>
        </div>
      </div>
    );
  }

  // Invalid token
  if (!isValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Link không hợp lệ
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Link đặt lại mật khẩu đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu link mới.
              </p>
            </div>

            <div className="space-y-3">
              <Link
                href="/forgot-password-admin"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition"
              >
                Yêu cầu link mới
              </Link>
              <Link
                href="/login-admin"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Quay lại đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Đặt lại mật khẩu thành công!
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Bạn đã được đăng nhập tự động. Đang chuyển hướng đến trang Admin...
              </p>
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Reset password form
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Đặt lại mật khẩu
            </h2>
            {userInfo && (
              <p className="mt-2 text-sm text-gray-600">
                Đặt mật khẩu mới cho: <strong>{userInfo.email}</strong>
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Mật khẩu mới
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  placeholder="Nhập mật khẩu mới"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  placeholder="Nhập lại mật khẩu mới"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Password requirements */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-600 font-medium mb-2">Yêu cầu mật khẩu:</p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li className={password.length >= 8 ? "text-green-600" : ""}>
                  {password.length >= 8 ? "✓" : "○"} Ít nhất 8 ký tự
                </li>
                <li className={/[A-Za-z]/.test(password) ? "text-green-600" : ""}>
                  {/[A-Za-z]/.test(password) ? "✓" : "○"} Chứa ít nhất một chữ cái
                </li>
                <li className={/\d/.test(password) ? "text-green-600" : ""}>
                  {/\d/.test(password) ? "✓" : "○"} Chứa ít nhất một số
                </li>
                <li className={password && confirmPassword && password === confirmPassword ? "text-green-600" : ""}>
                  {password && confirmPassword && password === confirmPassword ? "✓" : "○"} Mật khẩu xác nhận khớp
                </li>
              </ul>
            </div>

            {/* Validation errors */}
            {password && confirmPassword && password !== confirmPassword && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Mật khẩu xác nhận không khớp
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !password || !confirmPassword || password !== confirmPassword || password.length < 8}
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
            </button>
          </form>
        </div>

        {/* Footer Links */}
        <div className="mt-6 text-center">
          <Link href="/login-admin" className="text-sm text-gray-400 hover:underline">
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
