# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create account
3. Click "New Project"
4. Fill in:
   - **Name**: GlampingHub
   - **Database Password**: (generate secure password)
   - **Region**: Southeast Asia (Singapore) - closest to Vietnam
   - **Pricing Plan**: Free (for development)
5. Click "Create new project"
6. Wait ~2 minutes for project to be ready

## Step 2: Get API Credentials

1. In your Supabase project dashboard, go to **Settings** > **API**
2. Copy these values:
   - **Project URL** → This is your `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → This is your `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

## Step 3: Update Environment Variables

1. Create `.env.local` file in project root:

```bash
cp .env.example .env.local
```

2. Edit `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Step 4: Run Database Migrations

### Option A: Using Supabase Dashboard (Recommended for first setup)

1. Go to **SQL Editor** in your Supabase dashboard
2. Click "New query"
3. Copy entire content from `supabase/migrations/20251107000001_initial_schema.sql`
4. Paste into SQL editor
5. Click "Run" or press Ctrl/Cmd + Enter
6. Wait for completion (should see "Success" message)
7. Repeat for `20251107000002_seed_data.sql`

### Option B: Using Supabase CLI (Advanced)

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link to your project:
```bash
supabase link --project-ref your-project-ref
```

4. Push migrations:
```bash
supabase db push
```

## Step 5: Verify Database Setup

1. Go to **Table Editor** in Supabase dashboard
2. You should see all tables:
   - ✅ regions (5 sample regions)
   - ✅ campsites (3 sample campsites)
   - ✅ pitches (5 sample pitches)
   - ✅ filters (15 sample filters)
   - ✅ filter_categories (11 categories)
   - ✅ discount_categories (2 categories)
   - ✅ discounts (3 sample discounts)
   - ✅ users
   - ✅ admins (1 sample admin)
   - ✅ bookings
   - ✅ payments
   - ✅ reviews
   - ✅ media
   - And more...

3. Click on each table to verify data is populated

## Step 6: Test Database Connection

1. Start your Next.js dev server:
```bash
npm run dev
```

2. Create a test API route to verify connection:

```typescript
// app/api/test-db/route.ts
import { supabase } from '@/lib/supabase/client';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .limit(5);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      regions: data,
      message: 'Database connection successful!'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
```

3. Visit `http://localhost:3000/api/test-db`
4. You should see JSON response with regions data

## Step 7: Configure Row Level Security (RLS)

For production, you'll need to enable RLS. For development, you can disable it:

1. Go to **Authentication** > **Policies** in Supabase dashboard
2. For each table, you can either:
   - **Development**: Disable RLS (not recommended for production)
   - **Production**: Create specific policies

### Sample RLS Policies (for production):

```sql
-- Allow public read access to regions
CREATE POLICY "Public regions are viewable by everyone"
ON regions FOR SELECT
USING (true);

-- Allow public read access to active campsites
CREATE POLICY "Active campsites are viewable by everyone"
ON campsites FOR SELECT
USING (is_active = true);

-- Only authenticated users can create bookings
CREATE POLICY "Authenticated users can create bookings"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users can view their own bookings
CREATE POLICY "Users can view own bookings"
ON bookings FOR SELECT
USING (auth.uid() = user_id OR guest_email = auth.email());

-- Admins can do everything
-- (Implement admin-specific policies based on role)
```

## Troubleshooting

### Connection Error
- ✅ Check `.env.local` file exists and has correct values
- ✅ Verify NEXT_PUBLIC_SUPABASE_URL starts with `https://`
- ✅ Restart dev server after changing `.env.local`

### Migration Errors
- ✅ Run migrations in order (initial_schema first, then seed_data)
- ✅ Check for syntax errors in SQL editor
- ✅ Verify you're using PostgreSQL-compatible SQL

### No Data in Tables
- ✅ Ensure seed_data.sql was run successfully
- ✅ Check table contents in Table Editor
- ✅ Verify foreign key relationships are correct

## Next Steps

After successful setup:
1. ✅ Database schema created
2. ✅ Sample data seeded
3. ✅ Supabase client configured
4. ⏭️ Continue to Task 3: Setup authentication system

---

**Need help?** Check [Supabase Documentation](https://supabase.com/docs) or create an issue.
