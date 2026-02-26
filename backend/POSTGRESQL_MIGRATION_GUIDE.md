# SQLite to PostgreSQL Migration Guide

This guide will help you migrate your ZetechVerse backend from SQLite to PostgreSQL.

## Prerequisites

1. **PostgreSQL Server**: Make sure you have PostgreSQL installed and running
2. **Node.js**: Ensure you have Node.js installed (version 14 or higher)
3. **Existing Data**: Your existing SQLite database should be in `database/zetechverse.db`

## Migration Steps

### 1. Install PostgreSQL Dependencies

The migration script has already updated your `package.json` to use `pg` instead of `sqlite3`. Install the new dependencies:

```bash
npm install
```

### 2. Set Up PostgreSQL Database

1. Create a new database in PostgreSQL:
   ```sql
   CREATE DATABASE zetechverse;
   ```

2. Create a user (optional but recommended):
   ```sql
   CREATE USER zetechverse_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE zetechverse TO zetechverse_user;
   ```

### 3. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` file with your PostgreSQL credentials:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=zetechverse
   DB_USER=postgres  # or your created user
   DB_PASSWORD=your_password_here
   ```

### 4. Initialize PostgreSQL Database Schema

Run the PostgreSQL database initialization:

```bash
npm run init-db
```

This will create all the tables and indexes using the PostgreSQL-compatible schema.

### 5. Migrate Existing Data (Optional)

If you have existing data in SQLite that you want to migrate:

```bash
npm run migrate-data
```

This script will:
- Connect to both SQLite and PostgreSQL databases
- Transfer all data from SQLite to PostgreSQL
- Transform boolean values from SQLite (0/1) to PostgreSQL (true/false)
- Handle data type conversions automatically

### 6. Test the Migration

Start your application to test the PostgreSQL connection:

```bash
npm run dev
```

Check the console output for successful PostgreSQL connection messages.

## Key Changes Made

### Database Configuration
- **File**: `src/config/db.js`
- **Changes**: Replaced SQLite3 connection with PostgreSQL Pool
- **Connection**: Uses connection pooling for better performance

### Schema Updates
- **File**: `database/schema_postgresql.sql`
- **Changes**: 
  - `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY`
  - `BOOLEAN DEFAULT 1` → `BOOLEAN DEFAULT true`
  - `DATETIME` → `TIMESTAMP`
  - Added PostgreSQL-specific triggers for `updated_at` columns

### Model Updates
- **Files**: All model files in `src/models/`
- **Changes**: Updated boolean handling from SQLite integers to PostgreSQL booleans

### Package Dependencies
- **Removed**: `sqlite3`
- **Added**: `pg` (PostgreSQL client)

### New Scripts
- `init-db`: Initialize PostgreSQL database schema
- `migrate-data`: Migrate data from SQLite to PostgreSQL

## Troubleshooting

### Connection Issues
- Ensure PostgreSQL is running
- Check your `.env` file credentials
- Verify database exists and user has permissions

### Migration Issues
- Make sure SQLite database file exists
- Check PostgreSQL database is empty before migration
- Review error logs for specific table issues

### Performance Considerations
- PostgreSQL connection pooling is configured for 20 connections
- Consider adjusting `max`, `idleTimeoutMillis`, and `connectionTimeoutMillis` in `db.js` based on your needs

## Post-Migration Cleanup

After successful migration:

1. **Backup**: Keep a backup of your SQLite database
2. **Remove Old Files**: You can remove SQLite-specific files if no longer needed:
   - `database/schema.sql` (SQLite version)
   - `scripts/init-db.js` (SQLite version)
3. **Update Documentation**: Update any README files that reference SQLite

## Benefits of PostgreSQL

- **Better Performance**: Especially for concurrent connections
- **Advanced Features**: Full-text search, JSON support, advanced indexing
- **Scalability**: Better suited for production environments
- **Data Integrity**: More robust constraint handling
- **Community**: Larger ecosystem and tooling support

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL server host | `localhost` |
| `DB_PORT` | PostgreSQL server port | `5432` |
| `DB_NAME` | Database name | `zetechverse` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `password` |

## Support

If you encounter issues during migration:
1. Check PostgreSQL logs
2. Review application error logs
3. Ensure all environment variables are set correctly
4. Verify database permissions
