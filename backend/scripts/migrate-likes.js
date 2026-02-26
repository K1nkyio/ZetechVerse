const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../database/zetechverse.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to database.');
});

const columnExists = (table, column) => new Promise((resolve, reject) => {
  db.all(`PRAGMA table_info(${table});`, (err, rows) => {
    if (err) reject(err);
    else resolve(rows.some((row) => row.name === column));
  });
});

const tableExists = (table) => new Promise((resolve, reject) => {
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [table], (err, row) => {
    if (err) reject(err);
    else resolve(!!row);
  });
});

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, (err) => {
    if (err) reject(err);
    else resolve();
  });
});

async function migrate() {
  try {
    console.log(`Database path: ${dbPath}`);

    if (!(await columnExists('events', 'likes_count'))) {
      await run("ALTER TABLE events ADD COLUMN likes_count INTEGER DEFAULT 0;");
      console.log('Added events.likes_count');
    }

    if (!(await columnExists('marketplace_listings', 'likes_count'))) {
      await run("ALTER TABLE marketplace_listings ADD COLUMN likes_count INTEGER DEFAULT 0;");
      console.log('Added marketplace_listings.likes_count');
    }

    if (!(await tableExists('blog_post_likes'))) {
      await run(`
        CREATE TABLE blog_post_likes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          blog_post_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          liked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (blog_post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(blog_post_id, user_id)
        );
      `);
      await run("CREATE INDEX idx_blog_post_likes_post ON blog_post_likes(blog_post_id);");
      await run("CREATE INDEX idx_blog_post_likes_user ON blog_post_likes(user_id);");
      console.log('Created blog_post_likes table');
    }

    if (!(await tableExists('event_likes'))) {
      await run(`
        CREATE TABLE event_likes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          liked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(event_id, user_id)
        );
      `);
      await run("CREATE INDEX idx_event_likes_event ON event_likes(event_id);");
      await run("CREATE INDEX idx_event_likes_user ON event_likes(user_id);");
      console.log('Created event_likes table');
    }

    if (!(await tableExists('marketplace_listing_likes'))) {
      await run(`
        CREATE TABLE marketplace_listing_likes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          listing_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          liked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(listing_id, user_id)
        );
      `);
      await run("CREATE INDEX idx_marketplace_listing_likes_listing ON marketplace_listing_likes(listing_id);");
      await run("CREATE INDEX idx_marketplace_listing_likes_user ON marketplace_listing_likes(user_id);");
      console.log('Created marketplace_listing_likes table');
    }

    console.log('Likes migration complete.');
  } catch (error) {
    console.error('Likes migration failed:', error.message);
    process.exit(1);
  } finally {
    db.close((err) => {
      if (err) console.error('Error closing database:', err.message);
      else console.log('Database connection closed.');
    });
  }
}

migrate();
