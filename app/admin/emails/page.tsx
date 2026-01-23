"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  Eye,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  RefreshCcw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useAdminLocale } from '@/components/providers/AdminI18nProvider';

interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  subject: string;
  body: string;
  type: string;
  description: string;
  is_active: boolean;
  is_default: boolean;
  available_variables: string[];
  created_at: string;
}

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  template_id: string;
  template_name: string;
  trigger_event: string;
  trigger_timing: string;
  trigger_offset_days: number;
  trigger_time: string;
  is_active: boolean;
  total_sent: number;
  last_triggered_at: string;
}

interface EmailLog {
  id: string;
  booking_reference: string;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  template_name: string;
  status: string;
  sent_at: string;
  created_at: string;
}

export default function GlampingEmailsPage() {
  const { toast } = useToast();
  const t = useTranslations('admin.emailsPage');
  const { locale } = useAdminLocale();
  const [activeTab, setActiveTab] = useState('templates');

  // Templates state
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  // Automation rules state
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);

  // Email logs state
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Fetch templates
  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const response = await fetch('/api/admin/glamping/email-templates');
      const data = await response.json();

      if (data.success) {
        setTemplates(data.data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: t('error'),
        description: t('fetchTemplatesError'),
        variant: 'destructive',
      });
    } finally {
      setTemplatesLoading(false);
    }
  };

  // Fetch automation rules
  const fetchRules = async () => {
    setRulesLoading(true);
    try {
      const response = await fetch('/api/admin/glamping/automation-rules');
      const data = await response.json();

      if (data.success) {
        setRules(data.data);
      }
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setRulesLoading(false);
    }
  };

  // Fetch email logs
  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const response = await fetch('/api/admin/glamping/email-logs?limit=50');
      const data = await response.json();

      if (data.success) {
        setLogs(data.data);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (activeTab === 'rules') {
      fetchRules();
    } else if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab]);

  // Preview template
  const handlePreviewTemplate = async (template: EmailTemplate) => {
    try {
      // Open preview in new window
      const previewWindow = window.open('', '_blank', 'width=800,height=600');
      if (!previewWindow) {
        toast({
          title: t('error'),
          description: t('previewBlockedError'),
          variant: "destructive",
        });
        return;
      }

      // Show loading
      previewWindow.document.write('<html><body><div style="text-align:center;padding:50px;">Loading preview...</div></body></html>');

      // Fetch preview HTML
      const response = await fetch('/api/admin/glamping/email-templates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateSlug: template.slug }),
      });

      if (!response.ok) {
        throw new Error('Failed to load preview');
      }

      const html = await response.text();

      // Write HTML to new window
      previewWindow.document.open();
      previewWindow.document.write(html);
      previewWindow.document.close();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message || t('previewError'),
        variant: "destructive",
      });
    }
  };

  // Toggle automation rule
  const handleToggleRule = async (ruleId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/glamping/automation-rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: t('success'),
          description: !currentStatus ? t('automationEnabled') : t('automationDisabled')
        });
        fetchRules();
      }
    } catch (error) {
      toast({
        title: t('error'),
        description: t('updateRuleError'),
        variant: 'destructive'
      });
    }
  };

  // Get template type badge
  const getTypeBadge = (type: string) => {
    const badges: Record<string, { labelKey: string; className: string }> = {
      booking_confirmation: { labelKey: 'types.bookingConfirmation', className: 'bg-green-100 text-green-700' },
      pre_arrival: { labelKey: 'types.preArrival', className: 'bg-blue-100 text-blue-700' },
      post_stay: { labelKey: 'types.postStay', className: 'bg-purple-100 text-purple-700' },
      payment_reminder: { labelKey: 'types.paymentReminder', className: 'bg-yellow-100 text-yellow-700' },
      cancellation: { labelKey: 'types.cancellation', className: 'bg-red-100 text-red-700' },
      custom: { labelKey: 'types.custom', className: 'bg-gray-100 text-gray-700' }
    };

    const badge = badges[type] || badges.custom;
    return <Badge className={badge.className}>{t(badge.labelKey)}</Badge>;
  };

  // Get status badge for logs
  const getStatusBadge = (status: string) => {
    const badges: Record<string, { icon: any; className: string }> = {
      sent: { icon: CheckCircle2, className: 'text-green-600' },
      pending: { icon: Clock, className: 'text-yellow-600' },
      failed: { icon: XCircle, className: 'text-red-600' }
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return <Icon className={cn('w-4 h-4', badge.className)} />;
  };

  return (
    <div className="p-0 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600 mt-1">
            {t('description')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => fetchTemplates()}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            {t('refresh')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            {t('tabs.templates')} ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Play className="w-4 h-4" />
            {t('tabs.automationRules')} ({rules.length})
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            {t('tabs.emailLogs')} ({logs.length})
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          {/* Templates Grid */}
          {templatesLoading ? (
            <div className="text-center py-12">
              <RefreshCcw className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <CardDescription className="line-clamp-1">
                          {template.subject}
                        </CardDescription>
                      </div>
                      {template.is_default && (
                        <Badge variant="outline" className="ml-2">{t('badges.default')}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {getTypeBadge(template.type)}
                      <Badge variant={template.is_active ? 'default' : 'outline'}>
                        {template.is_active ? t('badges.active') : t('badges.inactive')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {template.description || t('noDescription')}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePreviewTemplate(template)}
                        title={t('previewTemplate')}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {t('preview')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Automation Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          {rulesLoading ? (
            <div className="text-center py-12">
              <RefreshCcw className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">{t('noRules') || 'No automation rules configured yet'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{rule.name}</h3>
                          <Badge variant={rule.is_active ? 'default' : 'outline'}>
                            {rule.is_active ? t('badges.active') : t('badges.inactive')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{rule.description}</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">{t('rules.template')}:</span>
                            <p className="font-medium">{rule.template_name}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">{t('rules.trigger')}:</span>
                            <p className="font-medium">{rule.trigger_event}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">{t('rules.timing')}:</span>
                            <p className="font-medium">
                              {rule.trigger_timing === 'immediate' ? t('rules.immediate') :
                               `${rule.trigger_offset_days} ${t('rules.days')} ${rule.trigger_offset_days < 0 ? t('rules.before') : t('rules.after')}`}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">{t('rules.totalSent')}:</span>
                            <p className="font-medium">{rule.total_sent}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="sm"
                          variant={rule.is_active ? 'outline' : 'default'}
                          onClick={() => handleToggleRule(rule.id, rule.is_active)}
                        >
                          {rule.is_active ? (
                            <>
                              <Pause className="w-4 h-4 mr-2" />
                              {t('rules.pause')}
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              {t('rules.activate')}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Email Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{t('logs.status')}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{t('logs.recipient')}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{t('logs.subject')}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{t('logs.template')}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{t('logs.booking')}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{t('logs.sentAt')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          {t('noLogs') || 'No email logs yet'}
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {getStatusBadge(log.status)}
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{log.recipient_name}</p>
                              <p className="text-sm text-gray-600">{log.recipient_email}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">{log.subject}</td>
                          <td className="px-4 py-3 text-sm">{log.template_name}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="font-mono text-xs">
                              {log.booking_reference}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {log.sent_at ? new Date(log.sent_at).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US') : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}
