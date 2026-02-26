const { get, all } = require('./src/config/db');

async function checkAllPosts() {
  try {
    console.log('=== CHECKING ALL POSTS ===');
    
    // Check all posts regardless of status
    const allPosts = await all(`
      SELECT 
        p.id,
        p.title,
        p.category_id,
        c.name as category_name,
        p.status,
        p.created_at
      FROM blog_posts p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
      LIMIT 10
    `);
    
    console.log('All recent posts:');
    if (Array.isArray(allPosts)) {
      allPosts.forEach(post => {
        console.log(`  "${post.title}" -> ${post.category_name || 'Uncategorized'} (${post.status})`);
        console.log(`    ID: ${post.id}, Created: ${post.created_at}`);
        console.log('');
      });
    } else {
      console.log('No posts found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkAllPosts();
