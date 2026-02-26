const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/zetechverse.db');

console.log('Verifying blog posts data...\n');

const query = `
  SELECT 
    p.id, 
    p.title, 
    p.status, 
    p.category_id,
    c.name as category_name,
    p.excerpt,
    LENGTH(p.content) as content_length,
    p.created_at
  FROM blog_posts p
  LEFT JOIN categories c ON p.category_id = c.id
  WHERE p.status = 'published'
  ORDER BY p.created_at DESC
`;

db.all(query, [], (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log(`Found ${rows.length} published posts:\n`);
    rows.forEach(post => {
      console.log(`ID: ${post.id}`);
      console.log(`Title: ${post.title}`);
      console.log(`Category: ${post.category_name || 'NULL'} (ID: ${post.category_id || 'NULL'})`);
      console.log(`Excerpt: ${post.excerpt ? post.excerpt.substring(0, 50) + '...' : 'NULL'}`);
      console.log(`Content Length: ${post.content_length} chars`);
      console.log(`Created: ${post.created_at}`);
      console.log('---');
    });
  }
  db.close();
});
