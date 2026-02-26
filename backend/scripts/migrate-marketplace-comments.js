const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Database path
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../database/zetechverse.db');

console.log('🚀 Migrating marketplace comments table...');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database.');
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Migration SQL for marketplace comments
const migrationSQL = `
-- ===========================================
-- MARKETPLACE COMMENTS
-- ===========================================

CREATE TABLE IF NOT EXISTS marketplace_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    moderated_by INTEGER,
    moderated_at DATETIME,
    parent_comment_id INTEGER, -- For nested comments
    likes_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (moderated_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_comment_id) REFERENCES marketplace_comments(id) ON DELETE CASCADE
);

-- Create indexes for marketplace comments
CREATE INDEX IF NOT EXISTS idx_marketplace_comments_listing ON marketplace_comments(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_comments_user ON marketplace_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_comments_status ON marketplace_comments(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_comments_created ON marketplace_comments(created_at);

-- Create trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_marketplace_comments_updated_at
    AFTER UPDATE ON marketplace_comments
    FOR EACH ROW
    BEGIN
        UPDATE marketplace_comments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
`;

async function runMigration() {
  try {
    console.log('🚀 Running marketplace comments migration...');

    // Execute the migration
    await new Promise((resolve, reject) => {
      db.exec(migrationSQL, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('🎉 Marketplace comments migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err.message);
      } else {
        console.log('✅ Database connection closed.');
      }
      console.log('🎯 Migration complete!');
    });
  }
}

runMigration();