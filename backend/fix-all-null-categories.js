const { get, run, all } = require('./src/config/db');

async function fixAllNullCategories() {
  try {
    console.log('=== FIXING ALL NULL CATEGORIES ===');
    
    // Get all posts with null category_id
    const nullCategoryPosts = await get('SELECT id, title FROM blog_posts WHERE category_id IS NULL AND status = \'published\'');
    console.log('Posts with null category:', nullCategoryPosts);
    
    // Assign them to a default category (e.g., Technology)
    const defaultCategory = await get('SELECT id FROM categories WHERE name = ? AND type = \'blog\' LIMIT 1', ['Technology']);
    
    if (defaultCategory && nullCategoryPosts) {
      console.log('Using default category ID:', defaultCategory.id);
      
      // Update all null category posts
      await run(
        'UPDATE blog_posts SET category_id = ? WHERE category_id IS NULL AND status = \'published\'',
        [defaultCategory.id]
      );
      
      console.log('All posts updated successfully!');
    }
    
    // Verify all posts now have categories
    const allPosts = await all(`
      SELECT 
        p.id,
        p.title,
        p.category_id,
        c.name as category_name
      FROM blog_posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'published'
      ORDER BY p.created_at DESC
      LIMIT 5
    `);
    
    console.log('Final verification - Recent posts:');
    if (Array.isArray(allPosts)) {
      allPosts.forEach(post => {
        console.log(`  "${post.title}" -> ${post.category_name || 'NULL'}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

fixAllNullCategories();
