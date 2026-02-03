---
name: fetch-data-to-local
description: Copy database từ Supabase production sang PostgreSQL local. Sử dụng khi cần sync data mới nhất từ production.
disable-model-invocation: true
allowed-tools: Bash(docker *)
---

# Fetch Data to Local

Copy toàn bộ database từ Supabase sang PostgreSQL local.

## Database URLs
- **Source (Supabase):** `postgresql://postgres.xodifnuirxrfelhefuju:YznuUf2BABNd79AI@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres`
- **Target (Local):** `postgresql://glampinghub:glampinghub_dev_password@localhost:54320/glampinghub_dev`

## Các bước thực hiện

### Bước 1: Export từ Supabase
Export toàn bộ database sử dụng pg_dump:
```bash
docker run --rm postgres:17 pg_dump \
  "postgresql://postgres.xodifnuirxrfelhefuju:YznuUf2BABNd79AI@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres" \
  --no-owner \
  --no-acl \
  > /tmp/glampinghub_export.sql
```

### Bước 2: Verify export
Kiểm tra file export:
```bash
ls -lh /tmp/glampinghub_export.sql
grep -c "CREATE TABLE" /tmp/glampinghub_export.sql
```

### Bước 3: Clear local database
Xóa toàn bộ schema public:
```bash
docker run --rm postgres:17 bash -c 'psql "postgresql://glampinghub:glampinghub_dev_password@host.docker.internal:54320/glampinghub_dev" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"'
```

### Bước 4: Import vào local
Import SQL dump:
```bash
docker run --rm -v /tmp:/data postgres:17 bash -c 'psql "postgresql://glampinghub:glampinghub_dev_password@host.docker.internal:54320/glampinghub_dev" -f /data/glampinghub_export.sql'
```

### Bước 5: Verify
Kiểm tra tables và row counts:
```bash
docker run --rm postgres:17 bash -c 'psql "postgresql://glampinghub:glampinghub_dev_password@host.docker.internal:54320/glampinghub_dev" -c "\dt public.*"'
```

```bash
docker run --rm postgres:17 bash -c 'psql "postgresql://glampinghub:glampinghub_dev_password@host.docker.internal:54320/glampinghub_dev" -c "SELECT '\''users'\'' as tbl, COUNT(*) FROM users UNION ALL SELECT '\''glamping_items'\'', COUNT(*) FROM glamping_items UNION ALL SELECT '\''glamping_bookings'\'', COUNT(*) FROM glamping_bookings UNION ALL SELECT '\''glamping_zones'\'', COUNT(*) FROM glamping_zones UNION ALL SELECT '\''customers'\'', COUNT(*) FROM customers;"'
```

## Lưu ý
- Sử dụng `host.docker.internal` thay vì `localhost` cho Docker
- Errors về Supabase roles (service_role, anon, authenticated) là bình thường
- Source database chỉ đọc, không thay đổi
