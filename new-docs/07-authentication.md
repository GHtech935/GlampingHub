# 7. Authentication System

## 7.1. Tổng quan

Hệ thống auth hỗ trợ 2 loại user:
1. **Staff** (admin, sale, operations, owner, glamping_owner) — quản lý admin panel
2. **Customer** — đặt booking, xem lịch sử

Auth dùng **JWT** stored trong **HTTP-only cookie** (`glampinghub_session`).

## 7.2. Architecture

```
┌─────────────────────────────────────────────────┐
│              middleware.ts                        │
│  Chạy ở Edge Runtime trước mọi request          │
│  ├── Subdomain routing (admin.abc.com)          │
│  ├── WWW redirect + HTTPS force                 │
│  └── Auth check:                                │
│      ├── /admin/* → require staff session       │
│      ├── /login-admin → redirect if logged in   │
│      ├── /login → redirect if logged in         │
│      └── public paths → pass through            │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│              lib/auth-edge.ts                    │
│  Edge-compatible JWT functions (jose library)    │
│  ├── createToken(user) → JWT string             │
│  ├── verifyToken(token) → SessionUser | null    │
│  ├── isStaffSession(session)                    │
│  └── isCustomerSession(session)                 │
└─────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│              lib/auth.ts                         │
│  Server-side auth functions (Node runtime)       │
│  ├── getSession() → read cookie + verify JWT    │
│  ├── setSession() → create JWT + set cookie     │
│  ├── clearSession() → delete cookie             │
│  ├── authenticateAdmin(email, password)          │
│  ├── authenticateCustomer(email, password)       │
│  ├── registerCustomer(data)                      │
│  ├── createStaffUser(data)                       │
│  ├── hasPermission(user, requiredRole)           │
│  ├── canAccessCampsite(user, campsiteId)         │
│  ├── canAccessGlampingZone(user, zoneId)         │
│  └── getAccessibleGlampingZoneIds(user)          │
└─────────────────────────────────────────────────┘
```

## 7.3. Session Token (JWT)

### Token Structure

```typescript
// Staff Session
interface StaffSession {
  type: 'staff';
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'sale' | 'operations' | 'owner' | 'glamping_owner';
  campsiteId?: string;       // Legacy camping
  campsiteIds?: string[];    // Multiple campsites
  glampingZoneIds?: string[]; // Glamping zones cho glamping_owner
}

// Customer Session
interface CustomerSession {
  type: 'customer';
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isRegistered: boolean;
}

type SessionUser = StaffSession | CustomerSession;
```

### Cookie Configuration
```typescript
{
  httpOnly: true,           // Không truy cập được từ JavaScript
  secure: true,             // HTTPS only (production)
  sameSite: 'lax',          // CSRF protection
  maxAge: 60 * 60 * 24 * 7, // 7 ngày
  path: '/',
}
```

### JWT Library
- **Edge runtime**: `jose` (cho middleware)
- **Node runtime**: `jose` (cho API routes + server components)
- Secret: `process.env.JWT_SECRET`

## 7.4. Staff Roles & Permissions

| Role | Quyền | Glamping Zone Access |
|------|-------|---------------------|
| `admin` | Full access tất cả | All zones |
| `sale` | Booking management, customer view | All zones |
| `operations` | Booking + inventory cho assigned campsite | No glamping |
| `owner` | Full cho assigned camping campsites | No glamping |
| `glamping_owner` | Full cho assigned glamping zones | Assigned zones only |

### Permission Check Functions

```typescript
// Check if user has specific role
hasPermission(session, 'admin'); // true for admin
hasPermission(session, ['admin', 'sale']); // true for admin OR sale

// Check if user can access a zone
canAccessGlampingZone(session, zoneId);
// admin/sale → true (all zones)
// glamping_owner → true if zone in glampingZoneIds
// others → false

// Get zone IDs for filtering
getAccessibleGlampingZoneIds(session);
// admin/sale → null (= no filter, all zones)
// glamping_owner → ['zone-id-1', 'zone-id-2']
// others → []
```

## 7.5. Auth Flow Diagrams

### Staff Login
```
1. POST /api/auth/admin/login { email, password }
2. authenticateAdmin():
   a. Query users table (WHERE email AND is_active)
   b. bcrypt.compare(password, password_hash)
   c. Update last_login_at
   d. Log to login_history
   e. Fetch campsiteIds / glampingZoneIds (junction tables)
   f. Return StaffSession
3. setSession(session):
   a. createToken(session) → JWT string
   b. Set HTTP-only cookie
4. Response: { user: StaffSession }
```

### Customer Login
```
1. POST /api/auth/customer/login { email, password }
2. authenticateCustomer():
   a. Query customers table (WHERE email AND password_hash IS NOT NULL)
   b. bcrypt.compare(password, password_hash)
   c. Update last_login_at
   d. Return CustomerSession
3. setSession(session)
4. Response: { user: CustomerSession }
```

### OAuth Login (Google/Facebook)
```
1. GET /api/auth/customer/oauth/google/start
   → Redirect to Google consent screen
2. GET /api/auth/customer/oauth/google/callback?code=...
   a. Exchange code for tokens
   b. Fetch user profile
   c. createOrUpdateCustomerFromOAuth(profile)
   d. setSession(customerSession)
   e. Redirect to / (homepage)
```

### Guest Booking (No Account)
```
1. Customer fills in email + name + phone on booking form
2. POST /api/glamping/booking
3. createOrGetCustomer():
   a. Check if customer exists by email
   b. If exists → update info
   c. If not → create new customer (is_registered = false)
4. No session set (guest stays as guest)
```

## 7.6. Middleware Auth Logic

```typescript
// middleware.ts logic simplified:

// Public paths (no auth required):
const publicPaths = [
  '/', '/glamping', '/login', '/register',
  '/login-admin', '/forgot-password', '/reset-password',
  '/api/auth/*', '/api/glamping/*', '/api/settings/public',
  '/api/upload', '/api/webhooks',
];

// Admin paths → require staff session
if (pathname.startsWith('/admin')) {
  if (!session) → redirect /login-admin
  if (session.type === 'customer') → redirect /
  if (session.type === 'staff') → check role in ['admin', 'sale', 'operations', 'owner', 'glamping_owner']
}

// Login pages → redirect if already logged in
if (pathname === '/login-admin' && isStaffSession) → redirect /admin
if (pathname === '/login' && isCustomerSession) → redirect /
```

## 7.7. API Route Auth Pattern

Trong mỗi admin API route:

```typescript
import { getSession, isStaffSession, canAccessGlampingZone } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // 1. Get session
  const session = await getSession();
  if (!session || !isStaffSession(session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Check zone access (optional, for zone-specific data)
  const zoneId = request.nextUrl.searchParams.get('zoneId');
  if (zoneId && !canAccessGlampingZone(session, zoneId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 3. Proceed with business logic
  // ...
}
```

## 7.8. Shared Auth với CampingHub

GlampingHub và CampingHub dùng chung:
- **Database:** Same `users` + `customers` tables
- **JWT_SECRET:** Must be identical → staff can login to both apps
- **Cookie name:** Different! `glampinghub_session` vs `campinghub_session`
- **Users table:** Same staff accounts, role determines access

Khi tạo staff user với role `admin` hoặc `sale`, user có thể login vào cả 2 hệ thống.
