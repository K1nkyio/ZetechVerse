const { run, get } = require('./src/config/db');

async function fixSpecificPost() {
  try {
    console.log('=== FIXING SPECIFIC POST ===');
    
    // Update the specific post to have the correct category
    const result = await run(
      'UPDATE blog_posts SET category_id = ? WHERE title = ?',
      [40, 'This One Thing is the Biggest Predictor of Divorce']
    );
    
    console.log('Update result:', result);
    console.log('✅ Fixed the specific post!');
    
    // Verify the fix
    const fixedPost = await get(`
      SELECT 
        p.id,
        p.title,
        p.category_id,
        c.name as category_name,
        c.type as category_type
      FROM blog_posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.title = ?
    `, ['This One Thing is the Biggest Predictor of Divorce']);
    
    console.log('Fixed post:', fixedPost);
    
    // Check for other posts that might have the same issue
    const nullCategoryPosts = await get(`
      SELECT id, title
      FROM blog_posts 
      WHERE category_id IS NULL AND status = 'published'
    `);
    
    console.log('\\nOther posts with null categories:', nullCategoryPosts);
    
    // Let's also check posts that might have been assigned to wrong categories
    const techCategoryPosts = await get(`
      SELECT 
        p.id,
        p.title,
        p.category_id,
        c.name as category_name
      FROM blog_posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.category_id = 23 AND c.name = 'Technology'
      ORDER BY p.created_at DESC
      LIMIT 10
    `);
    
    console.log('\\nPosts assigned to Technology category:');
    if (Array.isArray(techCategoryPosts)) {
      techCategoryPosts.forEach(post => {
        console.log(`  "${post.title}" -> ${post.category_name}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

fixSpecificPost();
