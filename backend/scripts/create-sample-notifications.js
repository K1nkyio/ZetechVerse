const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Database path
const dbPath = path.join(__dirname, '../database/zetechverse.db');

console.log('🔔 Creating sample notifications...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to database.');
});

async function createSampleNotifications() {
  try {
    // Get admin user IDs
    const adminUsers = await new Promise((resolve, reject) => {
      db.all("SELECT id FROM users WHERE role IN ('admin', 'super_admin')", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log(`Found ${adminUsers.length} admin users`);

    // Sample notifications
    const notifications = [
      {
        type: 'announcement',
        title: 'Welcome to ZetechVerse!',
        message: 'Your admin dashboard is now active. Explore the features and manage your content effectively.',
        related_id: null
      },
      {
        type: 'system',
        title: 'System Maintenance Completed',
        message: 'Scheduled maintenance has been completed. All systems are now operating normally.',
        related_id: null
      },
      {
        type: 'update',
        title: 'New Features Available',
        message: 'Check out the latest updates including improved notification system and enhanced profile management.',
        related_id: null
      },
      {
        type: 'alert',
        title: 'Security Reminder',
        message: 'Remember to change your password regularly and enable two-factor authentication when available.',
        related_id: null
      }
    ];

    let totalCreated = 0;

    // Create notifications for each admin user
    for (const user of adminUsers) {
      for (const notification of notifications) {
        // Check if notification already exists for this user
        const existing = await new Promise((resolve, reject) => {
          db.get(
            "SELECT id FROM notifications WHERE user_id = ? AND title = ?",
            [user.id, notification.title],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });

        if (!existing) {
          await new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO notifications (user_id, type, title, message, related_id) VALUES (?, ?, ?, ?, ?)`,
              [user.id, notification.type, notification.title, notification.message, notification.related_id],
              function(err) {
                if (err) reject(err);
                else {
                  totalCreated++;
                  resolve();
                }
              }
            );
          });
        }
      }
    }

    console.log(`✅ Created ${totalCreated} sample notifications`);

  } catch (error) {
    console.error('❌ Error creating sample notifications:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err.message);
      } else {
        console.log('✅ Database connection closed.');
      }
      console.log('🎯 Sample notifications creation complete!');
    });
  }
}

createSampleNotifications();