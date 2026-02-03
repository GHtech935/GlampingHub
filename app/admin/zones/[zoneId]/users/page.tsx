"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Shield,
  Activity,
  Clock,
  Search,
  RefreshCcw,
  Lock,
  Unlock,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  LogIn,
  CheckCircle,
  MapPin
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { StatCard, StatCardGrid } from '@/components/admin/StatCard';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  campsite_id: string;              // DEPRECATED: for backward compatibility
  campsite_name: string;            // DEPRECATED: for backward compatibility
  glamping_zone_id: string | null;  // DEPRECATED: use assigned_zone_ids
  glamping_zone_name: string | null; // DEPRECATED: use assigned_zone_names
  assigned_zone_ids: string[] | null;  // NEW: array of zone IDs from user_glamping_zones
  assigned_zone_names: string[] | null; // NEW: array of zone names from user_glamping_zones
  role_description: string;
  is_active: boolean;
  phone: string;
  last_login_at: string;
  failed_login_attempts: number;
  created_at: string;
}

interface ActivityLog {
  id: string;
  admin_full_name: string;
  admin_email: string;
  action: string;
  entity_type: string;
  entity_name: string;
  status: string;
  created_at: string;
}

interface LoginHistory {
  id: string;
  admin_name: string;
  email: string;
  login_at: string;
  logout_at: string;
  status: string;
  ip_address: string;
  device_type: string;
  browser: string;
}


export default function UsersPage() {
  const params = useParams();
  const zoneId = params.zoneId as string;
  const t = useTranslations('admin.usersPage');
  const tCommon = useTranslations('common');
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('users');

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);

  // Change password modal state
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [passwordChangeUser, setPasswordChangeUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Activity logs state
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityLogsLoading, setActivityLogsLoading] = useState(false);

  // Login history state
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [loginHistoryLoading, setLoginHistoryLoading] = useState(false);

  // Search/filter state
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [zoneFilterValue, setZoneFilterValue] = useState('all');

  // Form state
  const normalizeRoleValue = (role?: string | null) =>
    role ? role.trim().toLowerCase() : 'operations';

  const [formRole, setFormRole] = useState<string>('operations');

  // Zone state for multi-select (glamping_owner, sale, operations)
  const [zones, setZones] = useState<Array<{id: string, name: string}>>([]);
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);

  // User role state
  const [userRole, setUserRole] = useState<string | null>(null);


  // Fetch users assigned to this zone
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (userSearch) params.append('search', userSearch);
      // Filter users by zoneId or zone filter dropdown
      if (zoneId === 'all' && zoneFilterValue !== 'all') {
        params.append('zoneId', zoneFilterValue);
      } else if (zoneId && zoneId !== 'all') {
        params.append('zoneId', zoneId);
      }

      const response = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: t('toast.error'),
        description: t('toast.fetchError'),
        variant: 'destructive',
      });
    } finally {
      setUsersLoading(false);
    }
  };

  // Fetch activity logs
  const fetchActivityLogs = async () => {
    setActivityLogsLoading(true);
    try {
      const response = await fetch('/api/admin/activity-logs?limit=100');
      const data = await response.json();

      if (data.success) {
        setActivityLogs(data.data);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setActivityLogsLoading(false);
    }
  };

  // Fetch login history
  const fetchLoginHistory = async () => {
    setLoginHistoryLoading(true);
    try {
      const response = await fetch('/api/admin/login-history?limit=100');
      const data = await response.json();

      if (data.success) {
        setLoginHistory(data.data);
      }
    } catch (error) {
      console.error('Error fetching login history:', error);
    } finally {
      setLoginHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter, userSearch, zoneFilterValue]);

useEffect(() => {
  const fetchUserRole = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
          const data = await res.json();
          setUserRole(data.user?.role || null);
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error);
      }
    };
    fetchUserRole();
  }, []);

  useEffect(() => {
    if (selectedUser?.role) {
      setFormRole(normalizeRoleValue(selectedUser.role));
      // Load assigned zones from user_glamping_zones table
      setSelectedZoneIds(selectedUser.assigned_zone_ids || []);
    }
  }, [selectedUser]);

  // Fetch glamping zones for multi-select
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const response = await fetch('/api/admin/glamping/zones');
        if (!response.ok) {
          console.error('Failed to fetch zones:', await response.text());
          return;
        }

        const data = await response.json();
        const rawList = Array.isArray(data)
          ? data
          : data.zones || data.data || [];

        if (!Array.isArray(rawList)) {
          return;
        }

        const zoneList = rawList.map((z: any) => ({
          id: z.id,
          name: z.name?.vi || z.name?.en || z.name || 'Unknown'
        }));
        setZones(zoneList);
      } catch (error) {
        console.error('Error fetching zones:', error);
      }
    };
    fetchZones();
  }, []);

  useEffect(() => {
    if (activeTab === 'activity') {
      fetchActivityLogs();
    } else if (activeTab === 'login-history') {
      fetchLoginHistory();
    }
  }, [activeTab]);


  // Roles that support multi-zone assignment
  const multiZoneRoles = ['glamping_owner', 'sale', 'operations'];

  // Handle save user
  const handleSaveUser = async (formData: any) => {
    try {
      const normalizedRole = normalizeRoleValue(formRole);

      // Validate: glamping_owner must have a zone assigned
      if (normalizedRole === 'glamping_owner' && selectedZoneIds.length === 0) {
        toast({
          title: t('toast.error'),
          description: 'Chủ Glamping phải được gán vào ít nhất một zone',
          variant: 'destructive'
        });
        return;
      }

      const url = selectedUser
        ? `/api/admin/users/${selectedUser.id}`
        : '/api/admin/users';

      const method = selectedUser ? 'PUT' : 'POST';

      // Prepare zone data based on role
      const requestBody: any = {
        ...formData,
        role: normalizedRole
      };

      // For glamping_owner, sale, operations roles - send glampingZoneIds array
      if (multiZoneRoles.includes(normalizedRole) && selectedZoneIds.length > 0) {
        requestBody.glampingZoneIds = selectedZoneIds;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: t('toast.success'),
          description: data.message
        });
        setIsUserModalOpen(false);
        setFormRole('operations');
        // Keep zone selection if viewing specific zone, reset if "all"
        setSelectedZoneIds(zoneId !== 'all' ? [zoneId] : []);
        fetchUsers();
      } else {
        toast({
          title: t('toast.error'),
          description: data.error,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: t('toast.saveError'),
        variant: 'destructive'
      });
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId: string) => {
    if (!confirm(t('toast.deleteConfirm'))) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: t('toast.success'),
          description: data.message
        });
        fetchUsers();
      }
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: t('toast.deleteError'),
        variant: 'destructive'
      });
    }
  };

  // Handle activate user (reactivate deactivated account)
  const handleActivateUser = async (userId: string) => {
    if (!confirm(t('toast.activateConfirm'))) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH'
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: t('toast.success'),
          description: data.message
        });
        fetchUsers();
      }
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: t('toast.activateError'),
        variant: 'destructive'
      });
    }
  };

  // Handle change password
  const handleChangePassword = async () => {
    if (!passwordChangeUser) return;

    // Validate passwords
    if (newPassword.length < 8) {
      toast({
        title: t('toast.error'),
        description: 'Mật khẩu phải có ít nhất 8 ký tự',
        variant: 'destructive'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: t('toast.error'),
        description: 'Mật khẩu xác nhận không khớp',
        variant: 'destructive'
      });
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${passwordChangeUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: t('toast.success'),
          description: 'Đổi mật khẩu thành công'
        });
        setIsChangePasswordModalOpen(false);
        setPasswordChangeUser(null);
        setNewPassword('');
        setConfirmPassword('');
        setShowNewPassword(false);
        setShowConfirmPassword(false);
      } else {
        toast({
          title: t('toast.error'),
          description: data.error || 'Không thể đổi mật khẩu',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: 'Đã xảy ra lỗi khi đổi mật khẩu',
        variant: 'destructive'
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle impersonate user (login as)
  const handleImpersonateUser = async (userId: string, userName: string) => {
    if (!confirm(t('toast.impersonateConfirm', { name: userName }))) return;

    try {
      const response = await fetch('/api/admin/users/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: t('toast.success'),
          description: t('toast.impersonateSuccess', { name: userName })
        });
        // Redirect based on user role
        const role = data.user?.role;
        const glampingZoneIds = data.user?.glampingZoneIds;
        let redirectUrl = '/admin';

        // Redirect to appropriate page based on role
        if (role === 'glamping_owner' && glampingZoneIds && glampingZoneIds.length > 0) {
          // Glamping owner: redirect to their zone
          redirectUrl = `/admin/zones/${glampingZoneIds[0]}/dashboard`;
        } else if (role === 'owner' || role === 'admin') {
          // Admin/Owner: redirect to all zones dashboard
          redirectUrl = '/admin/zones/all/dashboard';
        } else if (role === 'operations' || role === 'sale') {
          // Operations/Sale: redirect to all zones bookings
          redirectUrl = '/admin/zones/all/bookings';
        }

        window.location.href = redirectUrl;
      } else {
        toast({
          title: t('toast.error'),
          description: data.error || t('toast.impersonateError'),
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: t('toast.error'),
        description: t('toast.impersonateError'),
        variant: 'destructive'
      });
    }
  };

  // Get role badge
  const getRoleBadge = (role: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      admin: { label: t('roles.admin'), className: 'bg-purple-100 text-purple-700' },
      sale: { label: t('roles.sale'), className: 'bg-blue-100 text-blue-700' },
      operations: { label: t('roles.operations'), className: 'bg-green-100 text-green-700' },
      owner: { label: 'Owner (Camping)', className: 'bg-orange-100 text-orange-700' },
      glamping_owner: { label: 'Chủ Glamping', className: 'bg-teal-100 text-teal-700' }
    };

    const badge = badges[role] || badges.operations;
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  // Get action badge
  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      create: 'bg-green-100 text-green-700',
      update: 'bg-blue-100 text-blue-700',
      delete: 'bg-red-100 text-red-700',
      login: 'bg-purple-100 text-purple-700',
      logout: 'bg-gray-100 text-gray-700'
    };

    return (
      <Badge className={colors[action] || 'bg-gray-100 text-gray-700'}>
        {action}
      </Badge>
    );
  };

  return (
    <div className="p-0 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600 mt-1">
            {t('subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => fetchUsers()}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            {t('refresh')}
          </Button>
          {userRole !== 'owner' && (
            <Button onClick={() => {
              setSelectedUser(null);
              setFormRole('operations');
              // Auto-assign current zone if viewing specific zone page
              setSelectedZoneIds(zoneId !== 'all' ? [zoneId] : []);
              setIsUserModalOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              {t('addUser')}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {!usersLoading && (
        <StatCardGrid>
          <StatCard
            title={t('stats.totalUsers')}
            value={users.length}
            icon={Users}
            color="blue"
          />
          <StatCard
            title={t('stats.active')}
            value={users.filter((u) => u.is_active).length}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title={t('stats.admins')}
            value={users.filter((u) => u.role === 'admin').length}
            icon={Shield}
            color="purple"
          />
          <StatCard
            title={t('stats.zones')}
            value={new Set(users.flatMap((u) => u.assigned_zone_ids || []).filter(Boolean)).size}
            icon={MapPin}
            color="orange"
          />
        </StatCardGrid>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            {t('tabs.users')} ({users.length})
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            {t('tabs.activityLogs')} ({activityLogs.length})
          </TabsTrigger>
          <TabsTrigger value="login-history" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {t('tabs.loginHistory')} ({loginHistory.length})
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder={t('search.placeholder')}
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-10"
                      autoComplete="off"
                    />
                  </div>
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('search.allRoles')}</SelectItem>
                    <SelectItem value="admin">{t('roles.admin')}</SelectItem>
                    <SelectItem value="sale">{t('roles.sale')}</SelectItem>
                    <SelectItem value="operations">{t('roles.operations')}</SelectItem>
                    <SelectItem value="glamping_owner">Chủ Glamping</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('search.allStatus')}</SelectItem>
                    <SelectItem value="active">{t('status.active')}</SelectItem>
                    <SelectItem value="inactive">{t('status.inactive')}</SelectItem>
                  </SelectContent>
                </Select>
                {zoneId === 'all' && (
                  <Select value={zoneFilterValue} onValueChange={setZoneFilterValue}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder={t('zoneFilter')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allZones')}</SelectItem>
                      {zones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          {usersLoading ? (
            <div className="text-center py-12">
              <RefreshCcw className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{t('table.user')}</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{t('table.role')}</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{t('table.status')}</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{t('table.lastLogin')}</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{t('table.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">
                                {user.first_name} {user.last_name}
                              </p>
                              <p className="text-sm text-gray-600">{user.email}</p>
                              {user.phone && (
                                <p className="text-sm text-gray-500">{user.phone}</p>
                              )}
                              {/* Show all assigned glamping zones */}
                              {user.assigned_zone_names && user.assigned_zone_names.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {user.assigned_zone_names.map((zoneName, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      📍 {zoneName}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {getRoleBadge(user.role)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={user.is_active ? 'default' : 'outline'}>
                              {user.is_active ? t('status.active') : t('status.inactive')}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {user.last_login_at
                              ? new Date(user.last_login_at).toLocaleString('vi-VN')
                              : t('table.noLogin')}
                          </td>
                          <td className="px-4 py-3">
                            {userRole !== 'owner' && (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setFormRole(normalizeRoleValue(user.role));
                                    setSelectedZoneIds(user.assigned_zone_ids || []);  // Load assigned zones
                                    setIsUserModalOpen(true);
                                  }}
                                  title={t('table.edit')}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => handleImpersonateUser(user.id, `${user.first_name} ${user.last_name}`)}
                                  title={t('table.loginAs')}
                                >
                                  <LogIn className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                  onClick={() => {
                                    setPasswordChangeUser(user);
                                    setNewPassword('');
                                    setConfirmPassword('');
                                    setShowNewPassword(false);
                                    setShowConfirmPassword(false);
                                    setIsChangePasswordModalOpen(true);
                                  }}
                                  title="Đổi mật khẩu"
                                >
                                  <Key className="w-4 h-4" />
                                </Button>
                                {user.is_active ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteUser(user.id)}
                                    title={t('table.delete')}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => handleActivateUser(user.id)}
                                    title={t('table.activate')}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Activity Logs Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{t('activityLogs.time')}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{t('activityLogs.user')}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{t('activityLogs.action')}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{t('activityLogs.entity')}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{t('activityLogs.status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {activityLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(log.created_at).toLocaleString('vi-VN')}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{log.admin_full_name}</p>
                            <p className="text-sm text-gray-600">{log.admin_email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {getActionBadge(log.action)}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{log.entity_type}</p>
                            {log.entity_name && (
                              <p className="text-sm text-gray-600">{log.entity_name}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                            {log.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Login History Tab */}
        <TabsContent value="login-history" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{t('loginHistory.time')}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{t('loginHistory.user')}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{t('loginHistory.ipAddress')}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{t('loginHistory.device')}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{t('loginHistory.status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loginHistory.map((history) => (
                      <tr key={history.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(history.login_at).toLocaleString('vi-VN')}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{history.admin_name}</p>
                            <p className="text-sm text-gray-600">{history.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {history.ip_address || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {history.device_type} • {history.browser}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={history.status === 'success' ? 'default' : 'destructive'}>
                            {history.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Form Modal */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? t('modal.editTitle') : t('modal.addTitle')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleSaveUser(Object.fromEntries(formData));
          }}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">{t('modal.firstName')}</Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    defaultValue={selectedUser?.first_name}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">{t('modal.lastName')}</Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    defaultValue={selectedUser?.last_name}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">{t('modal.email')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={selectedUser?.email}
                  required
                  disabled={!!selectedUser}
                />
              </div>

              {!selectedUser && (
                <div>
                  <Label htmlFor="password">{t('modal.password')}</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                  />
                </div>
              )}

              <div>
                <Label htmlFor="phone">{t('modal.phone')}</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={selectedUser?.phone}
                />
              </div>

              <div>
                <div>
                  <Label htmlFor="role">{t('modal.role')}</Label>
                  <Select
                    name="role"
                    value={formRole}
                    onValueChange={(value) => setFormRole(normalizeRoleValue(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Only show admin option when viewing all zones page */}
                      {zoneId === 'all' && (
                        <SelectItem value="admin">{t('roles.admin')}</SelectItem>
                      )}
                      <SelectItem value="sale">{t('roles.sale')}</SelectItem>
                      <SelectItem value="operations">{t('roles.operationsDetail')}</SelectItem>
                      <SelectItem value="glamping_owner">Chủ Glamping</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Zone selector - show for roles that support multi-zone */}
              {zoneId === 'all' && multiZoneRoles.includes(formRole) && (
                <div>
                  <Label>Glamping Zones {formRole === 'glamping_owner' ? '(Bắt buộc)' : '(Tùy chọn)'}</Label>
                  <div className="mt-2 border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                    {zones.map((zone) => (
                      <label key={zone.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={selectedZoneIds.includes(zone.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedZoneIds([...selectedZoneIds, zone.id]);
                            } else {
                              setSelectedZoneIds(selectedZoneIds.filter(id => id !== zone.id));
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">{zone.name}</span>
                      </label>
                    ))}
                  </div>
                  {selectedZoneIds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedZoneIds.map(zoneId => {
                        const zone = zones.find(z => z.id === zoneId);
                        return zone ? (
                          <Badge key={zoneId} variant="secondary" className="text-xs">
                            {zone.name}
                            <button
                              type="button"
                              onClick={() => setSelectedZoneIds(selectedZoneIds.filter(id => id !== zoneId))}
                              className="ml-1 hover:text-red-500"
                            >
                              ×
                            </button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsUserModalOpen(false)}>
                {t('modal.cancel')}
              </Button>
              <Button type="submit">
                {selectedUser ? t('modal.update') : t('modal.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog open={isChangePasswordModalOpen} onOpenChange={setIsChangePasswordModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Đổi mật khẩu
            </DialogTitle>
            <DialogDescription>
              Đổi mật khẩu cho: <strong>{passwordChangeUser?.first_name} {passwordChangeUser?.last_name}</strong> ({passwordChangeUser?.email})
            </DialogDescription>
          </DialogHeader>

          <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
          {/* Hidden inputs to trap browser autofill */}
          <input type="text" name="trap-username" autoComplete="username" style={{ display: 'none' }} tabIndex={-1} />
          <input type="password" name="trap-password" autoComplete="current-password" style={{ display: 'none' }} tabIndex={-1} />

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="newPassword">Mật khẩu mới</Label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 pr-10"
                  placeholder="Nhập mật khẩu mới (ít nhất 8 ký tự)"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10"
                  placeholder="Nhập lại mật khẩu mới"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Mật khẩu xác nhận không khớp
              </p>
            )}

            {newPassword && newPassword.length < 8 && (
              <p className="text-sm text-yellow-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Mật khẩu phải có ít nhất 8 ký tự
              </p>
            )}
          </div>
          </form>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsChangePasswordModalOpen(false);
                setPasswordChangeUser(null);
                setNewPassword('');
                setConfirmPassword('');
              }}
            >
              Hủy
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={passwordLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 8}
            >
              {passwordLoading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
