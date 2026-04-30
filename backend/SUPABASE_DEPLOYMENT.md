# Supabase Production Database Setup

Use this when the frontend is on Vercel, the backend is on Render, and production PostgreSQL is on Supabase.

## Local Laptop

Keep `backend/.env` pointed at your local PostgreSQL server:

```env
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=zetechverse
DB_USER=postgres
DB_PASSWORD=your-local-postgres-password
DB_SSL=false
DB_POOL_MAX=20
```

Do not add Supabase `PG*` values or `DATABASE_URL` locally unless you intentionally want your laptop backend to connect to Supabase.

Initialize your local database from the backend folder:

```bash
npm install
npm run init-db
npm run create-admin-users
npm run dev
```

## Supabase

1. Create a Supabase project.
2. Open the SQL editor.
3. Run the contents of `backend/database/schema_postgresql.sql`.
4. Create your admin users by temporarily running `npm run create-admin-users` with the Supabase `PG*` variables, or by running the backend script from a trusted machine with production environment variables.

Avoid `npm run init-db -- --force` against Supabase. The script now refuses this by default because it drops and recreates the `public` schema.

## Render Backend Environment

Set these variables on the Render backend service:

```env
NODE_ENV=production
PGHOST=aws-1-eu-central-1.pooler.supabase.com
PGPORT=5432
PGDATABASE=postgres
PGUSER=postgres.hlgawzpmlqvbnfbjsvms
PGPASSWORD=your_actual_supabase_password
DB_SSL_REJECT_UNAUTHORIZED=false
JWT_SECRET=...
CLIENT_ORIGIN=https://your-vercel-user-dashboard.vercel.app,https://your-vercel-admin-dashboard.vercel.app
```

Also keep your existing production values for:

```env
PASSWORD_RESET_SECRET=...
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
```

The backend also still supports `DATABASE_URL`, but the `PG*` variables above match Supabase's connection settings and keep the password separate.

## Vercel Frontends

Point both Vercel frontends to Render:

```env
VITE_API_URL=https://your-render-backend.onrender.com/api
```

Redeploy the Render backend after changing database variables, then redeploy the Vercel apps if their API URL changed.

After Render deploys, test:

```bash
https://your-render-backend.onrender.com/api/health
```
