# Database Migrations

This folder contains SQL migration files for the GlampingHub application.

## Naming Convention

Migration files follow the pattern:
```
YYYYMMDD_description.sql          # Forward migration
YYYYMMDD_description.rollback.sql # Rollback migration (optional)
```

## How to Run Migrations

### Using psql CLI:
```bash
psql $DATABASE_URL -f migrations/20260123_add_glamping_zone_id_to_users.sql
```

### Using Node.js:
```bash
node -r dotenv/config -e "
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runMigration() {
  const sql = fs.readFileSync('migrations/20260123_add_glamping_zone_id_to_users.sql', 'utf8');
  await pool.query(sql);
  console.log('Migration completed');
  await pool.end();
}

runMigration().catch(console.error);
" dotenv_config_path=.env.local
```

## How to Rollback

```bash
psql $DATABASE_URL -f migrations/20260123_add_glamping_zone_id_to_users.rollback.sql
```

## Migration History

| Date | File | Description | Status |
|------|------|-------------|--------|
| 2026-01-23 | `20260123_add_glamping_zone_id_to_users.sql` | Add glamping_zone_id column to users table | ✅ Applied |

## Notes

- Always test migrations on a development database first
- Create rollback migrations for safety
- Document all schema changes
- Use `IF NOT EXISTS` / `IF EXISTS` for idempotency
