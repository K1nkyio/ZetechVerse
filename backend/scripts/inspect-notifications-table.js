const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath =
  process.env.DATABASE_PATH || path.join(__dirname, '..', 'database', 'zetechverse.db');

const db = new sqlite3.Database(dbPath);

db.get(
  "SELECT sql FROM sqlite_master WHERE type='table' AND name='notifications'",
  [],
  (err, row) => {
    if (err) {
      console.error('Failed to inspect notifications table:', err.message);
      process.exitCode = 1;
      db.close();
      return;
    }

    console.log('DB:', dbPath);
    console.log(row?.sql || 'notifications table not found');
    db.close();
  },
);
