const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, '../database/zetechverse.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Create events_comments table
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS events_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
      moderated_by INTEGER,
      moderated_at DATETIME,
      parent_comment_id INTEGER, -- For nested comments
      likes_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (moderated_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (parent_comment_id) REFERENCES events_comments(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS events_comments_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      comment_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (comment_id) REFERENCES events_comments(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(comment_id, user_id)
    );
  `;

  db.run(createTableSQL, (err) => {
    if (err) {
      console.error('Error creating events_comments table:', err.message);
    } else {
      console.log('✓ events_comments table created successfully or already exists');
      
      // Add indexes for better performance
      const createIndexesSQL = `
        CREATE INDEX IF NOT EXISTS idx_events_comments_event ON events_comments(event_id);
        CREATE INDEX IF NOT EXISTS idx_events_comments_user ON events_comments(user_id);
        CREATE INDEX IF NOT EXISTS idx_events_comments_status ON events_comments(status);
        CREATE INDEX IF NOT EXISTS idx_events_comments_created ON events_comments(created_at);
      `;
      
      db.exec(createIndexesSQL, (err) => {
        if (err) {
          console.error('Error creating indexes:', err.message);
        } else {
          console.log('✓ Indexes created successfully for events_comments table');
          
          // Create trigger for updated_at
          const createTriggerSQL = `
            CREATE TRIGGER IF NOT EXISTS update_events_comments_updated_at
              AFTER UPDATE ON events_comments
              FOR EACH ROW
              BEGIN
                  UPDATE events_comments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
              END;
          `;
          
          db.run(createTriggerSQL, (err) => {
            if (err) {
              console.error('Error creating trigger:', err.message);
            } else {
              console.log('✓ Trigger created successfully for events_comments table');
            }
            
            db.close((err) => {
              if (err) {
                console.error('Error closing database:', err.message);
              } else {
                console.log('✓ Database connection closed');
              }
            });
          });
        }
      });
    }
  });
});