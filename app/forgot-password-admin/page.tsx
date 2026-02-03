"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export default function AdminForgotPasswordPage() {
  const t = useTranslations("adminLogin");
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/admin/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Không thể gửi email đặt lại mật khẩu");
      }

      setEmailSent(true);
      toast({
        title: "Thành công",
        description: "Email đặt lại mật khẩu đã được gửi!",
      });
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

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-xl p-8">
            {/* Success Message */}
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Kiểm tra email của bạn
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Chúng tôi đã gửi link đặt lại mật khẩu đến <strong>{email}</strong>
              </p>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900 font-medium mb-2">
                Hướng dẫn tiếp theo:
              </p>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>Kiểm tra hộp thư đến của bạn</li>
                <li>Nhấn vào link trong email (có hiệu lực trong 1 giờ)</li>
                <li>Tạo mật khẩu mới cho tài khoản</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Link
                href="/login-admin"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Quay lại đăng nhập
              </Link>

              <button
                onClick={() => {
                  setEmailSent(false);
                  setEmail("");
                }}
                className="w-full flex justify-center py-2.5 px-4 text-sm font-medium text-primary hover:text-primary/90 transition"
              >
                Gửi lại email
              </button>
            </div>

            {/* Warning */}
            <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                <strong>Lưu ý:</strong> Nếu không thấy email, hãy kiểm tra thư mục spam hoặc rác.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Quên mật khẩu?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Nhập email của bạn để nhận link đặt lại mật khẩu
            </p>
          </div>

          {/* Info Banner */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-900 font-medium">
                  Dành cho Admin/Staff
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Trang này dành cho nhân viên hệ thống. Khách hàng vui lòng sử dụng{" "}
                  <Link href="/forgot-password" className="underline font-medium">
                    trang quên mật khẩu khách hàng
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Đang gửi..." : "Gửi link đặt lại mật khẩu"}
            </button>

            {/* Back to Login */}
            <Link
              href="/login-admin"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại đăng nhập
            </Link>
          </form>
        </div>

        {/* Footer Links */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Bạn là khách hàng?{" "}
            <Link href="/forgot-password" className="text-primary hover:underline font-medium">
              Quên mật khẩu khách hàng
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
