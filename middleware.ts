import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, isStaffSession, isCustomerSession } from './lib/auth-edge';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // ============================================
  // SUBDOMAIN ROUTING (for custom domains)
  // ============================================

  // Check if it's admin subdomain (admin.abc.com)
  if (hostname.startsWith('admin.')) {
    // If accessing admin subdomain but not on admin paths or /login-admin
    if (!pathname.startsWith('/admin') && !pathname.startsWith('/login-admin') && !pathname.startsWith('/api')) {
      // Redirect to /admin dashboard
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  // Redirect www to non-www
  if (hostname.startsWith('www.')) {
    const newHostname = hostname.replace('www.', '');
    const newUrl = new URL(request.url);
    newUrl.hostname = newHostname;
    return NextResponse.redirect(newUrl, 301);
  }

  // Force HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    const proto = request.headers.get('x-forwarded-proto');
    if (proto === 'http') {
      const httpsUrl = new URL(request.url);
      httpsUrl.protocol = 'https:';
      return NextResponse.redirect(httpsUrl, 301);
    }
  }

  // ============================================
  // AUTH LOGIC
  // ============================================

  return authMiddleware(request);
}

async function authMiddleware(request: NextRequest, response?: NextResponse) {
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = [
    '/',
    '/glamping',
    '/login',
    '/register',
    '/login-admin',
    '/forgot-password',
    '/reset-password',
    '/test',
    '/api/auth/admin/login',
    '/api/auth/customer/login',
    '/api/auth/customer/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/logout',
    '/api/auth/me',
    '/api/glamping',
    '/api/settings/public',
    '/api/upload',
    '/api/webhooks',
  ];

  // Check if path is public
  const isPublicPath = publicPaths.some((path) =>
    pathname === path || pathname.startsWith(path + '/')
  );

  // Admin paths
  const isAdminPath = pathname.startsWith('/admin');
  const isAdminLoginPath = pathname.startsWith('/login-admin');

  // Customer auth paths
  const isCustomerLoginPath = pathname === '/login';
  const isCustomerRegisterPath = pathname === '/register';

  // Get session token
  const token = request.cookies.get(process.env.SESSION_COOKIE_NAME || 'glampinghub_session')?.value;

  // Verify token
  const session = token ? await verifyToken(token) : null;

  // Handle admin login page
  if (isAdminLoginPath) {
    if (session && isStaffSession(session)) {
      // Staff already logged in → redirect to admin dashboard
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    if (session && isCustomerSession(session)) {
      // Customer trying to access admin login → redirect to home
      return NextResponse.redirect(new URL('/', request.url));
    }
    // Not logged in or no session → show admin login page
    return response || NextResponse.next();
  }

  // Handle customer login page
  if (isCustomerLoginPath) {
    if (session && isCustomerSession(session)) {
      // Customer already logged in → redirect to home
      return NextResponse.redirect(new URL('/', request.url));
    }
    if (session && isStaffSession(session)) {
      // Staff trying to access customer login → redirect to admin
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    // Not logged in → show customer login page
    return response || NextResponse.next();
  }

  // Handle customer register page
  if (isCustomerRegisterPath) {
    if (session) {
      // Already logged in (any type) → redirect appropriately
      return NextResponse.redirect(new URL(isStaffSession(session) ? '/admin' : '/', request.url));
    }
    return response || NextResponse.next();
  }

  // Handle admin routes (requires staff login)
  if (isAdminPath) {
    if (!session) {
      // Not logged in → redirect to admin login
      const url = new URL('/login-admin', request.url);
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }

    if (isCustomerSession(session)) {
      // Customer trying to access admin → forbidden, redirect to home
      return NextResponse.redirect(new URL('/', request.url));
    }

    if (isStaffSession(session)) {
      // Check staff role permissions
      const allowedRoles = ['admin', 'sale', 'operations', 'owner', 'glamping_owner'];
      if (!allowedRoles.includes(session.role)) {
        // Unknown role - redirect to login
        return NextResponse.redirect(new URL('/login-admin', request.url));
      }
    }
  }

  // Public paths or authenticated → allow
  return response || NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
};
