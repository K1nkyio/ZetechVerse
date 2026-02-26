const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../database/zetechverse.db');

const args = process.argv.slice(2);
const emailIndex = args.indexOf('--email');
const idIndex = args.indexOf('--id');

const email = emailIndex >= 0 ? args[emailIndex + 1] : null;
const id = idIndex >= 0 ? args[idIndex + 1] : null;

if (!email && !id) {
  console.error('Usage: node scripts/delete-user.js --email user@example.com');
  console.error('   or: node scripts/delete-user.js --id 123');
  process.exit(1);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to database.');
});

const deleteSql = email
  ? 'DELETE FROM users WHERE email = ?'
  : 'DELETE FROM users WHERE id = ?';

const deleteParam = email || id;

db.run(deleteSql, [deleteParam], function(err) {
  if (err) {
    console.error('Delete failed:', err.message);
    process.exit(1);
  }

  if (this.changes === 0) {
    console.log('No user found to delete.');
  } else {
    console.log(`Deleted ${this.changes} user(s).`);
  }

  db.close((closeErr) => {
    if (closeErr) {
      console.error('Error closing database:', closeErr.message);
    } else {
      console.log('Database connection closed.');
    }
  });
});
