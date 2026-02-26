const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../database/zetechverse.db');

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`Created database directory: ${dbDir}`);
}

const schemaPath = path.join(__dirname, '../database/schema.sql');
const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

console.log('Initializing ZetechVerse database...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database.');
});

db.run('PRAGMA foreign_keys = ON');

async function initializeDatabase() {
  try {
    console.log('Initializing ZetechVerse database...');

    await new Promise((resolve, reject) => {
      db.exec(schemaSQL, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('Database schema initialized successfully.');
    console.log(`Database location: ${dbPath}`);
    console.log('No default admin users were created.');
    console.log('To create admin users, run:');
    console.log('  npm run create-admin-users');
    console.log('Provide credentials via environment variables (see backend/README.md).');
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed.');
      }
      console.log('Database initialization complete.');
    });
  }
}

initializeDatabase();
