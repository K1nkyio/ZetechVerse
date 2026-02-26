const { get, all } = require('./src/config/db');

async function comprehensiveCheck() {
  try {
    console.log('=== COMPREHENSIVE CATEGORY CHECK ===');
    
    // 1. Check all posts with their categories
    const allPosts = await all(`
      SELECT 
        p.id,
        p.title,
        p.category_id,
        c.name as category_name,
        c.type as category_type
      FROM blog_posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'published'
      ORDER BY p.created_at DESC
      LIMIT 15
    `);
    
    console.log('All published posts:');
    if (Array.isArray(allPosts)) {
      allPosts.forEach(post => {
        const status = post.category_name ? `✅ ${post.category_name}` : `❌ NULL (ID: ${post.category_id})`;
        console.log(`  "${post.title}" -> ${status}`);
      });
    }
    
    // 2. Test the Post.create logic for different categories
    console.log('\\n=== TESTING CATEGORY RESOLUTION ===');
    
    const testCategories = ['Personal Development', 'Travel', 'Food', 'Relationship', 'Beauty'];
    
    for (const category of testCategories) {
      const result = await get(
        'SELECT id FROM categories WHERE name = ? AND type = \'blog\' LIMIT 1',
        [category]
      );
      console.log(`${category}: ${result ? `✅ ID ${result.id}` : '❌ NOT FOUND'}`);
    }
    
    // 3. Check if there are any posts that might have been created with wrong categories
    console.log('\\n=== CHECKING FOR MISASSIGNED POSTS ===');
    
    const recentPosts = await all(`
      SELECT 
        p.id,
        p.title,
        p.category_id,
        c.name as category_name,
        p.created_at
      FROM blog_posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'published'
      ORDER BY p.created_at DESC
      LIMIT 10
    `);
    
    if (Array.isArray(recentPosts)) {
      recentPosts.forEach(post => {
        const createdDate = new Date(post.created_at).toLocaleDateString();
        const categoryStatus = post.category_name || 'NULL';
        console.log(`  ${createdDate}: "${post.title.substring(0, 50)}..." -> ${categoryStatus}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

comprehensiveCheck();
