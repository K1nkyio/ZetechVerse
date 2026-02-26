const { all } = require('./src/config/db');

async function checkSchema() {
  try {
    const columns = await all('PRAGMA table_info(blog_posts)');
    console.log('blog_posts table columns:');
    columns.forEach(col => {
      console.log(`- ${col.name}: ${col.type} ${col.pk ? '(PRIMARY KEY)' : ''}`);
    });
    
    // Also check if there are any posts with views > 1
    const postsWithViews = await all('SELECT id, title, views_count FROM blog_posts WHERE views_count > 1 ORDER BY views_count DESC LIMIT 5');
    console.log('\nPosts with views > 1:');
    postsWithViews.forEach(post => {
      console.log(`- ${post.title}: ${post.views_count} views`);
    });
    
  } catch (e) {
    console.error('Error:', e);
  }
}

checkSchema();