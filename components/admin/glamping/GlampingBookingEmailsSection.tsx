'use client';

import { useState, useEffect } from 'react';
import { Mail, Send, Check, X, Clock, ChevronDown, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAdminLocale } from '@/components/providers/AdminI18nProvider';

type SendStatus = {
  type: 'sending' | 'success' | 'error';
  message: string;
} | null;

interface EmailLog {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  sent_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  template_slug: string | null;
  template_name: string;
  created_at: string;
}

interface EmailTemplate {
  slug: string;
  name: string;
}

interface GlampingBookingEmailsSectionProps {
  bookingId: string;
}

export default function GlampingBookingEmailsSection({ bookingId }: GlampingBookingEmailsSectionProps) {
  const { locale } = useAdminLocale();
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [sendStatus, setSendStatus] = useState<SendStatus>(null);

  const fetchEmails = async () => {
    try {
      const response = await fetch(`/api/admin/glamping/bookings/${bookingId}/emails`);
      if (response.ok) {
        const data = await response.json();
        setEmails(data.emails || []);
        setAvailableTemplates(data.available_templates || []);
      }
    } catch (error) {
      console.error('Error fetching email logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookingId) {
      fetchEmails();
    }
  }, [bookingId]);

  const handleSendEmail = async (templateSlug: string) => {
    const template = availableTemplates.find(t => t.slug === templateSlug);
    const templateName = template?.name || templateSlug;

    setSending(templateSlug);
    setSendStatus({
      type: 'sending',
      message: locale === 'vi' ? `Đang gửi "${templateName}"...` : `Sending "${templateName}"...`
    });

    try {
      const response = await fetch(`/api/admin/glamping/bookings/${bookingId}/emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_slug: templateSlug }),
      });

      if (response.ok) {
        setSendStatus({
          type: 'success',
          message: locale === 'vi' ? `Đã gửi "${templateName}" thành công!` : `"${templateName}" sent successfully!`
        });
        // Refresh email list
        await fetchEmails();
        // Auto-hide success message after 3 seconds
        setTimeout(() => setSendStatus(null), 3000);
      } else {
        const data = await response.json();
        setSendStatus({
          type: 'error',
          message: data.error || (locale === 'vi' ? 'Gửi email thất bại' : 'Failed to send email')
        });
        // Auto-hide error message after 5 seconds
        setTimeout(() => setSendStatus(null), 5000);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      setSendStatus({
        type: 'error',
        message: locale === 'vi' ? 'Gửi email thất bại' : 'Failed to send email'
      });
      setTimeout(() => setSendStatus(null), 5000);
    } finally {
      setSending(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Check className="h-3 w-3 mr-1" />
            {locale === 'vi' ? 'Đã gửi' : 'Sent'}
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <X className="h-3 w-3 mr-1" />
            {locale === 'vi' ? 'Lỗi' : 'Failed'}
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            {locale === 'vi' ? 'Đang chờ' : 'Pending'}
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Mail className="h-5 w-5" />
          {locale === 'vi' ? 'Lịch sử Email' : 'Email History'}
        </h3>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchEmails}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={!!sending}>
                <Send className="h-4 w-4 mr-2" />
                {locale === 'vi' ? 'Gửi email' : 'Send email'}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 z-[9999]" sideOffset={5}>
              {availableTemplates.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  {locale === 'vi' ? 'Không có template' : 'No templates available'}
                </div>
              ) : null}
              {availableTemplates.map((template) => (
                <DropdownMenuItem
                  key={template.slug}
                  onClick={() => handleSendEmail(template.slug)}
                  disabled={sending === template.slug}
                >
                  {sending === template.slug ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  {template.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Send Status Indicator */}
      {sendStatus && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
          sendStatus.type === 'sending'
            ? 'bg-blue-50 text-blue-700 border border-blue-200'
            : sendStatus.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {sendStatus.type === 'sending' && (
            <RefreshCw className="h-4 w-4 animate-spin" />
          )}
          {sendStatus.type === 'success' && (
            <CheckCircle className="h-4 w-4" />
          )}
          {sendStatus.type === 'error' && (
            <AlertCircle className="h-4 w-4" />
          )}
          <span>{sendStatus.message}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-4 text-gray-500">
          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
          {locale === 'vi' ? 'Đang tải...' : 'Loading...'}
        </div>
      ) : emails.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          <Mail className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p>{locale === 'vi' ? 'Chưa có email nào được gửi' : 'No emails sent yet'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-medium text-gray-600">
                  {locale === 'vi' ? 'Loại email' : 'Template'}
                </th>
                <th className="text-left py-2 px-2 font-medium text-gray-600">
                  {locale === 'vi' ? 'Người nhận' : 'Recipient'}
                </th>
                <th className="text-left py-2 px-2 font-medium text-gray-600">
                  {locale === 'vi' ? 'Trạng thái' : 'Status'}
                </th>
                <th className="text-left py-2 px-2 font-medium text-gray-600">
                  {locale === 'vi' ? 'Thời gian' : 'Time'}
                </th>
              </tr>
            </thead>
            <tbody>
              {emails.map((email) => (
                <tr key={email.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-2">
                    <span className="font-medium">{email.template_name}</span>
                  </td>
                  <td className="py-2 px-2 text-gray-600">
                    {email.recipient_email}
                  </td>
                  <td className="py-2 px-2">
                    {getStatusBadge(email.status)}
                    {email.failure_reason && (
                      <p className="text-xs text-red-500 mt-1">{email.failure_reason}</p>
                    )}
                  </td>
                  <td className="py-2 px-2 text-gray-500">
                    {formatDate(email.sent_at || email.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
