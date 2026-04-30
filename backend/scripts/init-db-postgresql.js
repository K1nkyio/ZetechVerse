require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { getPoolConfig, isSupabaseConnection } = require('../src/config/db-pool-config');

const schemaPath = path.join(__dirname, '../database/schema_postgresql.sql');
const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
const forceReset = process.argv.includes('--force');

console.log('Initializing ZetechVerse PostgreSQL database...');

// PostgreSQL connection configuration
const pool = new Pool(getPoolConfig());

async function initializeDatabase() {
  try {
    console.log('Connecting to PostgreSQL database...');
    
    // Test connection
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database.');

    const { rows } = await client.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'users'
      ) AS schema_exists
    `);

    const schemaExists = Boolean(rows?.[0]?.schema_exists);

    if (forceReset && isSupabaseConnection() && process.env.ALLOW_DATABASE_FORCE_RESET !== 'true') {
      throw new Error('Refusing to force reset a Supabase database. Set ALLOW_DATABASE_FORCE_RESET=true only if you intentionally want to drop and recreate the public schema.');
    }

    if (schemaExists && !forceReset) {
      console.log('Database schema already exists. Skipping initialization.');
      console.log('Use "npm run init-db -- --force" to reset and recreate the schema.');
      client.release();
      return;
    }

    if (schemaExists && forceReset) {
      console.log('Force reset requested. Dropping and recreating public schema...');
      await client.query('DROP SCHEMA public CASCADE');
      await client.query('CREATE SCHEMA public');
      await client.query('GRANT ALL ON SCHEMA public TO public');
      console.log('Public schema reset complete.');
    }
    
    // Execute schema
    console.log('Creating database schema...');
    await client.query(schemaSQL);
    console.log('Database schema initialized successfully.');
    
    client.release();
    
    console.log('Database initialization complete.');
    console.log('No default admin users were created.');
    console.log('To create admin users, run:');
    console.log('  npm run create-admin-users');
    console.log('Provide credentials via environment variables (see backend/README.md).');
    
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initializeDatabase();
