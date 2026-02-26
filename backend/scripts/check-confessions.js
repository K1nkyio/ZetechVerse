const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '../database/zetechverse.db');

console.log('🔍 Checking confessions in database...');

// Open database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database.');
});

db.all(`
  SELECT id, content, author_id, is_anonymous, status, created_at
  FROM confessions
  ORDER BY created_at DESC
  LIMIT 10
`, [], (err, rows) => {
  if (err) {
    console.error('❌ Error querying confessions:', err.message);
    db.close();
    return;
  }

  console.log('📝 Confessions in database:');
  if (rows.length === 0) {
    console.log('   No confessions found!');
  } else {
    rows.forEach((confession, index) => {
      console.log(`   ${index + 1}. ID: ${confession.id}`);
      console.log(`      Content: ${confession.content.substring(0, 50)}...`);
      console.log(`      Author: ${confession.is_anonymous ? 'Anonymous' : confession.author_id}`);
      console.log(`      Status: ${confession.status}`);
      console.log(`      Created: ${confession.created_at}`);
      console.log('');
    });
  }

  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err.message);
    } else {
      console.log('✅ Database connection closed.');
    }
  });
});
