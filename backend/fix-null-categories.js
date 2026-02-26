const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/zetechverse.db');

console.log('Fixing posts with null category_id...\n');

// Get Technology category ID
db.get("SELECT id FROM categories WHERE type='blog' AND name='Technology' LIMIT 1", [], (err, cat) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }
  
  if (!cat) {
    console.error('Technology category not found!');
    db.close();
    return;
  }
  
  const categoryId = cat.id;
  console.log(`Using category ID: ${categoryId} (Technology)\n`);
  
  // Update all posts with null category_id
  db.run(
    "UPDATE blog_posts SET category_id = ? WHERE category_id IS NULL",
    [categoryId],
    function(err) {
      if (err) {
        console.error('Error updating:', err);
      } else {
        console.log(`✅ Updated ${this.changes} posts with category_id=${categoryId}`);
        
        // Verify
        db.all("SELECT id, title, status, category_id FROM blog_posts WHERE status='published' ORDER BY id", [], (err, rows) => {
          if (err) {
            console.error('Error fetching:', err);
          } else {
            console.log('\n📋 Published posts after update:');
            rows.forEach(post => {
              console.log(`  ID: ${post.id} | ${post.title.substring(0, 40)} | Category ID: ${post.category_id}`);
            });
          }
          db.close();
        });
      }
    }
  );
});
