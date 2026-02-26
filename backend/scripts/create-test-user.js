const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

// Database path
const dbPath = path.join(__dirname, '../database/zetechverse.db');

console.log('👥 Creating test user...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to database.');
});

async function createTestUser() {
  try {
    // Create regular test user
    const userHash = await bcrypt.hash('password123', 12);
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT OR IGNORE INTO users (
          email, username, password_hash, full_name, role, is_active, email_verified
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'test@example.com',
        'testuser',
        userHash,
        'Test User',
        'user',
        1,
        1
      ], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('👥 Test user created/verified:');
    console.log('   Regular User:');
    console.log('     Email: test@example.com');
    console.log('     Username: testuser');
    console.log('     Password: password123');
    console.log('     Role: user');

  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    process.exit(1);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err.message);
      } else {
        console.log('✅ Database connection closed.');
      }
      console.log('🎯 Test user creation complete!');
    });
  }
}

createTestUser();