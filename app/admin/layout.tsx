"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Package,
  Tag,
  BarChart3,
  Users,
  Users2,
  Menu,
  X,
  LogOut,
  ChevronDown,
  DollarSign,
  Languages,
  Settings,
  Folder,
  CalendarDays,
  Percent,
  UtensilsCrossed,
  Landmark,
  Mail,
  Scale,
  Sliders,
} from "lucide-react";

// Role type
type UserRole = 'admin' | 'sale' | 'operations' | 'owner';

// Navigation types
type NavigationItem = {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  roles: UserRole[];
};

type NavigationGroup = {
  title?: string;  // Optional section title
  items: NavigationItem[];
  roles: UserRole[];
};

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as HotToaster } from "react-hot-toast";
import { AdminI18nProvider, useAdminLocale } from "@/components/providers/AdminI18nProvider";
import { useTranslations } from "next-intl";
import { NotificationBell } from "@/components/notifications";
import { ZoneSelector } from "@/components/admin/glamping/ZoneSelector";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userFirstName, setUserFirstName] = useState<string>('');
  const [userLastName, setUserLastName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const t = useTranslations('admin');
  const tHeader = useTranslations('header');
  const { locale, changeLocale } = useAdminLocale();

  // Extract zone ID from pathname
  const getZoneIdFromPath = (pathname: string): string | "all" => {
    // Don't extract zone ID from manage or new paths
    if (pathname.startsWith('/admin/zones/manage') || pathname.startsWith('/admin/zones/new')) {
      return "all";
    }
    const match = pathname.match(/\/admin\/zones\/([^\/]+)/);
    return match ? match[1] : "all";
  };

  const currentZoneId = getZoneIdFromPath(pathname);

  // Check if current page should hide sidebar
  const shouldHideSidebar = pathname.startsWith('/admin/zones/manage') || pathname.startsWith('/admin/zones/new');

  // Get user initials from first and last name
  const getUserInitials = () => {
    const firstInitial = userFirstName?.charAt(0)?.toUpperCase() || '';
    const lastInitial = userLastName?.charAt(0)?.toUpperCase() || '';
    return firstInitial + lastInitial || userName.charAt(0).toUpperCase() || 'U';
  };

  // Fetch user session on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user && data.user.type === 'staff') {
            setUserRole(data.user.role);
            setUserFirstName(data.user.firstName || '');
            setUserLastName(data.user.lastName || '');
            setUserName(`${data.user.firstName || ''} ${data.user.lastName || ''}`.trim() || 'User');
            setUserEmail(data.user.email || '');
          }
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  // Save system preference to localStorage
  useEffect(() => {
    localStorage.setItem('last_admin_system', 'glamping');
  }, []);

  // Navigation with role-based access (GLAMPING ONLY)
  // Build zone-aware hrefs
  const zonePrefix = `/admin/zones/${currentZoneId}`;

  const allNavigationGroups: NavigationGroup[] = [
    // Main navigation (no title) - GLAMPING FEATURES ONLY
    {
      roles: ['admin', 'sale', 'operations', 'owner'],
      items: [
        { name: currentZoneId === "all" ? t('zone') : t('dashboard'), href: `${zonePrefix}/dashboard`, icon: LayoutDashboard, roles: ['admin', 'sale', 'operations', 'owner'] },
        { name: t('items'), href: `${zonePrefix}/items`, icon: Package, roles: ['admin', 'operations', 'owner'] },
        { name: t('menu'), href: `${zonePrefix}/menu`, icon: UtensilsCrossed, roles: ['admin', 'operations', 'owner'] },
        { name: t('bookings'), href: `${zonePrefix}/bookings`, icon: BookOpen, roles: ['admin', 'sale', 'operations', 'owner'] },
        { name: t('categoryTag'), href: `${zonePrefix}/categories`, icon: Folder, roles: ['admin', 'owner'] },
        { name: t('parameters'), href: `${zonePrefix}/parameters`, icon: Sliders, roles: ['admin', 'owner'] },
        { name: t('events'), href: `${zonePrefix}/events`, icon: CalendarDays, roles: ['admin', 'sale', 'operations', 'owner'] },
        { name: t('discounts'), href: `${zonePrefix}/discounts`, icon: Percent, roles: ['admin', 'sale', 'owner'] },
        { name: t('rules'), href: `${zonePrefix}/rules`, icon: Scale, roles: ['admin', 'owner'] },
        { name: t('zoneSettings'), href: `${zonePrefix}/settings`, icon: Settings, roles: ['admin', 'owner'] },
        // TODO: Add when implemented
        // { name: "Calendar", href: `${zonePrefix}/calendar`, icon: Calendar, roles: ['admin', 'sale', 'operations', 'owner'] },
        // { name: "Pricing", href: `${zonePrefix}/pricing`, icon: DollarSign, roles: ['admin', 'operations', 'owner'] },
        { name: t('customers'), href: `${zonePrefix}/customers`, icon: Users2, roles: ['admin', 'sale', 'owner'] },
        { name: t('users'), href: `${zonePrefix}/users`, icon: Users, roles: ['admin', 'owner'] }, // Zone-specific users
        { name: t('bankAccounts'), href: "/admin/settings/bank-accounts", icon: Landmark, roles: ['admin', 'owner'] }, // Bank accounts are global
        { name: t('emailTemplates'), href: "/admin/emails", icon: Mail, roles: ['admin', 'owner'] }, // Email templates are global, not zone-specific
        // TODO: Add settings when implemented
        // { name: "Settings", href: "/admin/settings", icon: Settings, roles: ['admin'] },
      ]
    }
  ];

  // Filter navigation groups based on user role
  const navigationGroups = userRole
    ? allNavigationGroups
        .filter(group => group.roles.includes(userRole))
        .map(group => ({
          ...group,
          items: group.items.filter(item => item.roles.includes(userRole))
        }))
        .filter(group => group.items.length > 0)  // Remove empty groups
    : [];

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login-admin");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Mobile sidebar backdrop */}
        {!shouldHideSidebar && sidebarOpen && (
          <div
            className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        {!shouldHideSidebar && (
          <aside
            className={`
              fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200
              flex flex-col
              transform transition-transform duration-300 ease-in-out
              lg:translate-x-0
              ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            `}
          >
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-[200px] h-8 bg-gray-200 rounded animate-pulse" />
              </div>
            ) : (
              <Link
                href={`/admin/zones/${currentZoneId}/dashboard`}
                className="flex items-center gap-2"
              >
                <Image
                  src="/images/logo_new.jpg"
                  alt="GlampingHub Logo"
                  width={200}
                  height={32}
                  className="rounded"
                />
              </Link>
            )}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {loading ? (
              // Loading skeleton
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Actual navigation
              navigationGroups.map((group, groupIndex) => (
                <div key={groupIndex} className={groupIndex > 0 ? "mt-6" : ""}>
                  {/* Group title */}
                  {group.title && (
                    <div className="px-3 mb-2">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {t(group.title)}
                      </h3>
                    </div>
                  )}

                  {/* Divider before group (except first) */}
                  {groupIndex > 0 && group.title && (
                    <div className="border-t border-gray-200 mb-4" />
                  )}

                  {/* Group items */}
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={`
                            flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                            transition-colors duration-150
                            ${
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            }
                          `}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <item.icon className="w-5 h-5" />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </nav>

          {/* User section */}
          <div className="border-t border-gray-200 p-4">
            {loading ? (
              // Loading skeleton for user section
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded w-32 animate-pulse" />
                </div>
              </div>
            ) : (
              // Actual user dropdown
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-primary">
                        {getUserInitials()}
                      </span>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{userName || 'User'}</p>
                      <p className="text-xs text-gray-500 truncate" title={userEmail}>{userEmail || ''}</p>
                      {userRole && (
                        <span className={`inline-block text-xs px-1.5 py-0.5 rounded mt-0.5 ${
                          userRole === 'admin' ? 'bg-red-100 text-red-700' :
                          userRole === 'owner' ? 'bg-blue-100 text-blue-700' :
                          userRole === 'sale' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {userRole}
                        </span>
                      )}
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate" title={userName}>{userName}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    {tHeader('logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          </aside>
        )}

        {/* Main content */}
        <div className={shouldHideSidebar ? "" : "lg:pl-64"}>
          {/* Top header */}
          {!shouldHideSidebar && (
            <header className="sticky top-0 z-[1100] bg-white border-b border-gray-200">
            <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                <Menu className="w-6 h-6" />
              </button>

              <div className="flex-1" />

              {/* Header actions */}
              <div className="flex items-center gap-4">
                {/* Zone Selector */}
                {!loading && <ZoneSelector currentZoneId={currentZoneId} locale={locale} variant="header" />}

                {/* Notification Bell */}
                <NotificationBell userType="staff" />

                {/* Language Switcher */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Languages className="w-4 h-4 mr-2" />
                      {locale === 'vi' ? 'VI' : 'EN'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-[1200]">
                    <DropdownMenuItem onClick={() => changeLocale('vi')}>
                      Tiếng Việt
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeLocale('en')}>
                      English
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Link href="/" target="_blank">
                  <Button variant="outline" size="sm">
                    {t('viewCustomerSite')}
                  </Button>
                </Link>
              </div>
            </div>
            </header>
          )}

          {/* Page content */}
          <main className={shouldHideSidebar ? "p-0" : "p-4 sm:p-6 lg:p-8"}>{children}</main>
        </div>
      </div>
      <Toaster />
      <HotToaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            zIndex: 99999,
          },
        }}
      />
    </>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminI18nProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminI18nProvider>
  );
}
