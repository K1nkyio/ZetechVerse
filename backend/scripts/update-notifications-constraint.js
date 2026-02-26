const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Database path
const dbPath = path.join(__dirname, '../database/zetechverse.db');

console.log('🔧 Updating notifications table constraint...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to database.');
});

async function updateNotificationsConstraint() {
  try {
    // First, let's see the current notifications table schema
    console.log('📋 Checking current notifications table schema...');

    await new Promise((resolve, reject) => {
      db.all("PRAGMA table_info(notifications)", (err, rows) => {
        if (err) reject(err);
        else {
          console.log('Current notifications schema:');
          rows.forEach(row => {
            console.log(`  ${row.name}: ${row.type} ${row.pk ? 'PRIMARY KEY' : ''} ${row.notnull ? 'NOT NULL' : ''} ${row.dflt_value ? `DEFAULT ${row.dflt_value}` : ''}`);
          });
          resolve();
        }
      });
    });

    // Update the type column constraint by recreating the table
    console.log('🔄 Updating type column constraint...');

    // First, backup existing data
    console.log('💾 Backing up existing notifications data...');
    const existingNotifications = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM notifications", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log(`📊 Backed up ${existingNotifications.length} notifications`);

    // Drop the old table
    await new Promise((resolve, reject) => {
      db.run("DROP TABLE IF EXISTS notifications_backup", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Rename current table to backup
    await new Promise((resolve, reject) => {
      db.run("ALTER TABLE notifications RENAME TO notifications_backup", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Create new table with correct constraint
    console.log('🆕 Creating new notifications table with correct constraint...');
    const createTableSQL = `
      CREATE TABLE notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('system', 'personal', 'reminder', 'alert', 'maintenance', 'update', 'announcement', 'confession_like', 'confession_comment', 'event_reminder', 'application_update', 'listing_sold', 'blog_comment', 'posts', 'marketplace', 'events', 'opportunities', 'confessions')),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        related_id INTEGER,
        is_read BOOLEAN DEFAULT 0,
        read_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

    await new Promise((resolve, reject) => {
      db.run(createTableSQL, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Migrate data from backup
    console.log('📦 Migrating data from backup...');

    for (const notification of existingNotifications) {
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO notifications (
            id, user_id, type, title, message, related_id, is_read, read_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            notification.id,
            notification.user_id,
            notification.type,
            notification.title,
            notification.message,
            notification.related_id,
            notification.is_read || 0,
            notification.read_at,
            notification.created_at
          ],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    console.log('✅ Data migration completed');
    console.log('🗑️  Cleaning up backup table...');

    // Drop backup table
    await new Promise((resolve, reject) => {
      db.run("DROP TABLE notifications_backup", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('🎉 Notifications table constraint updated successfully!');
    console.log('📋 New type values allowed: system, personal, reminder, alert, maintenance, update, announcement, confession_like, confession_comment, event_reminder, application_update, listing_sold, blog_comment, posts, marketplace, events, opportunities, confessions');

  } catch (error) {
    console.error('❌ Error updating notifications constraint:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err.message);
      } else {
        console.log('✅ Database connection closed.');
      }
      console.log('🎯 Constraint update complete!');
    });
  }
}

updateNotificationsConstraint();