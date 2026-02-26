const { get, run, all } = require('./src/config/db');

async function checkExistingPosts() {
  try {
    console.log('=== CHECKING EXISTING POSTS ===');
    
    // Get all published posts and their categories
    const posts = await all(`
      SELECT 
        p.id,
        p.title,
        p.category_id,
        c.name as category_name
      FROM blog_posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'published'
      ORDER BY p.created_at DESC
      LIMIT 10
    `);
    
    console.log('Recent published posts:');
    if (Array.isArray(posts)) {
      posts.forEach(post => {
        console.log(`  "${post.title}" -> ${post.category_name || 'NULL (category_id: ' + post.category_id + ')'}`);
      });
    }
    
    // Check for posts with null category_id
    const nullPosts = await get(`
      SELECT id, title
      FROM blog_posts 
      WHERE category_id IS NULL AND status = 'published'
    `);
    
    if (nullPosts) {
      console.log('\\nPosts with null categories (need fixing):');
      console.log(nullPosts);
      
      // Fix them by assigning to Technology category
      const techCategory = await get('SELECT id FROM categories WHERE name = ? AND type = \'blog\' LIMIT 1', ['Technology']);
      if (techCategory) {
        await run('UPDATE blog_posts SET category_id = ? WHERE category_id IS NULL AND status = \'published\'', [techCategory.id]);
        console.log('\\n✅ Fixed null category posts by assigning to Technology');
      }
    } else {
      console.log('\\n✅ No posts with null categories found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkExistingPosts();
