const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

// SQLite configuration
const sqlitePath = process.env.DATABASE_PATH || path.join(__dirname, '../database/zetechverse.db');

// PostgreSQL configuration
const pgPool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'zetechverse',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

class DataMigrator {
  constructor() {
    this.sqliteDb = null;
    this.pgPool = pgPool;
  }

  async connect() {
    // Connect to SQLite
    this.sqliteDb = new sqlite3.Database(sqlitePath);
    console.log('Connected to SQLite database.');
    
    // Test PostgreSQL connection
    const client = await this.pgPool.connect();
    console.log('Connected to PostgreSQL database.');
    client.release();
  }

  async migrateTable(tableName, transformFn = null) {
    console.log(`\nMigrating table: ${tableName}`);
    
    try {
      // Get data from SQLite
      const sqliteData = await new Promise((resolve, reject) => {
        this.sqliteDb.all(`SELECT * FROM ${tableName}`, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      if (sqliteData.length === 0) {
        console.log(`  No data found in ${tableName}`);
        return;
      }

      console.log(`  Found ${sqliteData.length} records in ${tableName}`);

      // Transform data if needed
      const transformedData = transformFn ? sqliteData.map(transformFn) : sqliteData;

      // Get column names
      const columns = Object.keys(transformedData[0]);
      const columnNames = columns.join(', ');
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');

      // Insert into PostgreSQL
      const pgClient = await this.pgPool.connect();
      
      try {
        await pgClient.query('BEGIN');
        
        for (const row of transformedData) {
          const values = columns.map(col => row[col]);
          const insertSQL = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`;
          await pgClient.query(insertSQL, values);
        }
        
        await pgClient.query('COMMIT');
        console.log(`  Successfully migrated ${sqliteData.length} records to ${tableName}`);
        
      } catch (error) {
        await pgClient.query('ROLLBACK');
        throw error;
      } finally {
        pgClient.release();
      }

    } catch (error) {
      console.error(`  Error migrating ${tableName}:`, error.message);
      throw error;
    }
  }

  // Transform functions for specific tables
  transformUsers(row) {
    return {
      ...row,
      is_active: Boolean(row.is_active),
      email_verified: Boolean(row.email_verified)
    };
  }

  transformPosts(row) {
    return {
      ...row,
      is_featured: Boolean(row.is_featured)
    };
  }

  transformMarketplaceListings(row) {
    return {
      ...row,
      is_negotiable: Boolean(row.is_negotiable),
      urgent: Boolean(row.urgent)
    };
  }

  transformConfessions(row) {
    return {
      ...row,
      is_anonymous: Boolean(row.is_anonymous),
      is_hot: Boolean(row.is_hot)
    };
  }

  transformEvents(row) {
    return {
      ...row,
      is_paid: Boolean(row.is_paid),
      registration_required: Boolean(row.registration_required)
    };
  }

  transformBlogPosts(row) {
    return {
      ...row,
      featured: Boolean(row.featured)
    };
  }

  async migrateAll() {
    try {
      await this.connect();

      console.log('\n🚀 Starting data migration from SQLite to PostgreSQL...\n');

      // Migrate tables in order of dependencies
      await this.migrateTable('users', this.transformUsers);
      await this.migrateTable('categories');
      await this.migrateTable('posts', this.transformPosts);
      await this.migrateTable('marketplace_listings', this.transformMarketplaceListings);
      await this.migrateTable('opportunities');
      await this.migrateTable('opportunity_applications');
      await this.migrateTable('events', this.transformEvents);
      await this.migrateTable('event_registrations');
      await this.migrateTable('confessions', this.transformConfessions);
      await this.migrateTable('blog_posts', this.transformBlogPosts);
      
      // Migrate relationship tables
      await this.migrateTable('confession_likes');
      await this.migrateTable('confession_comments');
      await this.migrateTable('post_likes');
      await this.migrateTable('event_likes');
      await this.migrateTable('marketplace_comments');
      await this.migrateTable('marketplace_listing_likes');
      await this.migrateTable('blog_post_likes');
      await this.migrateTable('blog_post_comments');
      await this.migrateTable('events_comments');
      await this.migrateTable('events_comments_likes');
      await this.migrateTable('notifications');
      await this.migrateTable('messages');
      await this.migrateTable('activity_logs');

      console.log('\n✅ Data migration completed successfully!');

    } catch (error) {
      console.error('\n❌ Migration failed:', error.message);
      process.exit(1);
    } finally {
      if (this.sqliteDb) {
        this.sqliteDb.close();
      }
      await this.pgPool.end();
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  const migrator = new DataMigrator();
  migrator.migrateAll();
}

module.exports = DataMigrator;
