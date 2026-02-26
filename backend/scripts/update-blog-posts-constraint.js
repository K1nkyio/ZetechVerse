const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Database path
const dbPath = path.join(__dirname, '../database/zetechverse.db');

console.log('🔧 Updating blog_posts table constraint...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to database.');
});

async function updateBlogPostsConstraint() {
  try {
    // First, let's see the current schema
    console.log('📋 Checking current blog_posts table schema...');

    await new Promise((resolve, reject) => {
      db.all("PRAGMA table_info(blog_posts)", (err, rows) => {
        if (err) reject(err);
        else {
          console.log('Current blog_posts schema:');
          rows.forEach(row => {
            console.log(`  ${row.name}: ${row.type} ${row.pk ? 'PRIMARY KEY' : ''} ${row.notnull ? 'NOT NULL' : ''} ${row.dflt_value ? `DEFAULT ${row.dflt_value}` : ''}`);
          });
          resolve();
        }
      });
    });

    // Update the status column constraint by recreating the table
    console.log('🔄 Updating status column constraint...');

    // First, backup existing data
    console.log('💾 Backing up existing blog_posts data...');
    const existingPosts = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM blog_posts", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log(`📊 Backed up ${existingPosts.length} posts`);

    // Drop the old table
    await new Promise((resolve, reject) => {
      db.run("DROP TABLE IF EXISTS blog_posts_backup", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Rename current table to backup
    await new Promise((resolve, reject) => {
      db.run("ALTER TABLE blog_posts RENAME TO blog_posts_backup", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Create new table with correct constraint
    console.log('🆕 Creating new blog_posts table with correct constraint...');
    const createTableSQL = `
      CREATE TABLE blog_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        excerpt TEXT,
        content TEXT NOT NULL,
        category_id INTEGER,
        author_id INTEGER NOT NULL,
        status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'published', 'rejected', 'archived')),
        featured BOOLEAN DEFAULT 0,
        image_url VARCHAR(500),
        tags TEXT,
        seo_title VARCHAR(255),
        seo_description TEXT,
        reading_time_minutes INTEGER,
        views_count INTEGER DEFAULT 0,
        likes_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        published_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

    await new Promise((resolve, reject) => {
      db.run(createTableSQL, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Migrate data from backup, mapping old status values to new ones
    console.log('📦 Migrating data from backup...');

    for (const post of existingPosts) {
      // Map old status values to new constraint values
      let newStatus = post.status;
      if (!['draft', 'pending', 'published', 'rejected', 'archived'].includes(post.status)) {
        newStatus = 'draft'; // Default fallback
      }

      const insertSQL = `
        INSERT INTO blog_posts (
          id, title, slug, excerpt, content, category_id, author_id, status, featured,
          image_url, tags, seo_title, seo_description, reading_time_minutes,
          views_count, likes_count, comments_count, published_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await new Promise((resolve, reject) => {
        db.run(insertSQL, [
          post.id, post.title, post.slug, post.excerpt, post.content, post.category_id,
          post.author_id, newStatus, post.featured || 0, post.image_url, post.tags,
          post.seo_title, post.seo_description, post.reading_time_minutes,
          post.views_count || 0, post.likes_count || 0, post.comments_count || 0,
          post.published_at, post.created_at, post.updated_at
        ], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    console.log('✅ Data migration completed');
    console.log('🗑️  Cleaning up backup table...');

    // Drop backup table
    await new Promise((resolve, reject) => {
      db.run("DROP TABLE blog_posts_backup", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('🎉 Blog posts table constraint updated successfully!');
    console.log('📋 New status values allowed: draft, pending, published, rejected, archived');

  } catch (error) {
    console.error('❌ Error updating blog_posts constraint:', error.message);
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

updateBlogPostsConstraint();