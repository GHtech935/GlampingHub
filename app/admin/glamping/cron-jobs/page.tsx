'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'react-hot-toast';

interface CronJob {
  id: number;
  slug: string;
  name: string;
  description: string;
  cron_expression: string;
  is_active: boolean;
  is_running: boolean;
  last_run_at: string | null;
  stats: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    avgExecutionTimeMs: number | null;
  };
}

interface CronJobLog {
  id: number;
  job_slug: string;
  status: 'running' | 'success' | 'error';
  started_at: string;
  completed_at: string | null;
  execution_time_ms: number | null;
  records_processed: number | null;
  records_affected: number | null;
  error_message: string | null;
}

interface Stats {
  totalJobs: number;
  activeJobs: number;
  executionsLast24h: number;
  failedExecutions: number;
}

export default function CronJobsPage() {
  const t = useTranslations('admin.cronJobsPage');
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [logs, setLogs] = useState<CronJobLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'jobs' | 'history'>('jobs');

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/cron-jobs');
      const data = await response.json();

      if (data.success) {
        setJobs(data.jobs);
        setLogs(data.logs);
        setStats(data.stats);
      } else {
        toast.error('Failed to fetch cron jobs');
      }
    } catch (error) {
      console.error('Error fetching cron jobs:', error);
      toast.error('Error fetching cron jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleJob = async (jobSlug: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/admin/cron-jobs/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobSlug, isActive: !currentStatus }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Job ${!currentStatus ? 'enabled' : 'disabled'} successfully`);
        await fetchData();
      } else {
        toast.error(data.error || 'Failed to toggle job');
      }
    } catch (error) {
      console.error('Error toggling job:', error);
      toast.error('Error toggling job');
    }
  };

  const handleTriggerJob = async (jobSlug: string) => {
    try {
      toast.loading(`Triggering job ${jobSlug}...`, { id: jobSlug });

      const response = await fetch('/api/admin/cron-jobs/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobSlug }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Job triggered successfully`, { id: jobSlug });
        // Wait a moment then refresh data
        setTimeout(() => fetchData(), 2000);
      } else {
        toast.error(data.error || 'Failed to trigger job', { id: jobSlug });
      }
    } catch (error) {
      console.error('Error triggering job:', error);
      toast.error('Error triggering job', { id: jobSlug });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const getSuccessRate = (job: CronJob) => {
    const { successfulExecutions, totalExecutions } = job.stats;
    if (totalExecutions === 0) return 'N/A';
    return `${Math.round((successfulExecutions / totalExecutions) * 100)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-600 mt-2">{t('subtitle')}</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">{t('stats.totalJobs')}</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats.totalJobs}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">{t('stats.activeJobs')}</div>
            <div className="text-3xl font-bold text-green-600 mt-2">{stats.activeJobs}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">{t('stats.executionsLast24h')}</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">{stats.executionsLast24h}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600">{t('stats.failedExecutions')}</div>
            <div className="text-3xl font-bold text-red-600 mt-2">{stats.failedExecutions}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'jobs'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('tabs.jobs')}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('tabs.history')}
          </button>
        </nav>
      </div>

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('jobsTab.columns.jobName')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('jobsTab.columns.schedule')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('jobsTab.columns.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('jobsTab.columns.lastRun')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('jobsTab.columns.successRate')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{job.name}</div>
                    <div className="text-sm text-gray-500">{job.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {job.cron_expression}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        job.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {job.is_active ? t('jobsTab.status.active') : t('jobsTab.status.inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(job.last_run_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getSuccessRate(job)}
                    <span className="ml-2 text-xs text-gray-400">
                      ({job.stats.totalExecutions} {t('jobsTab.columns.last24h')})
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleTriggerJob(job.slug)}
                      className="text-purple-600 hover:text-purple-900"
                    >
                      {t('jobsTab.actions.runNow')}
                    </button>
                    <button
                      onClick={() => handleToggleJob(job.slug, job.is_active)}
                      className={`${
                        job.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                      }`}
                    >
                      {job.is_active ? t('jobsTab.actions.disable') : t('jobsTab.actions.enable')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Started
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Records
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Error
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {log.job_slug}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        log.status === 'success'
                          ? 'bg-green-100 text-green-800'
                          : log.status === 'error'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(log.started_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.execution_time_ms ? `${log.execution_time_ms}ms` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.records_processed !== null ? `${log.records_processed} / ${log.records_affected}` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-red-600 max-w-xs truncate">
                    {log.error_message || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Refresh Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {t('refresh')}
        </button>
      </div>
    </div>
  );
}
