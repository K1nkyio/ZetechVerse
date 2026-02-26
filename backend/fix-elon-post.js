const { get, run } = require('./src/config/db');

async function fixElonMuskPost() {
  try {
    console.log('=== FIXING ELON MUSK POST CATEGORY ===');
    
    // First, get the Careers category ID
    const careersCategory = await get('SELECT id FROM categories WHERE name = ? AND type = \'blog\' LIMIT 1', ['Careers']);
    
    if (careersCategory) {
      console.log('Found Careers category ID:', careersCategory.id);
      
      // Update the Elon Musk post to have the Careers category
      const result = await run(
        'UPDATE blog_posts SET category_id = ? WHERE id = ?',
        [careersCategory.id, 13] // Post ID 13 is Elon Musk post
      );
      
      console.log('Update result:', result);
      console.log('Elon Musk post updated successfully!');
      
      // Verify the update
      const updatedPost = await get(`
        SELECT 
          p.id,
          p.title,
          p.category_id,
          c.name as category_name,
          c.type as category_type
        FROM blog_posts p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = 13
      `);
      
      console.log('Updated post:', updatedPost);
      
    } else {
      console.log('Careers category not found!');
    }
    
    // Also fix any other posts with null category_id
    const nullCategoryPosts = await get('SELECT id, title FROM blog_posts WHERE category_id IS NULL AND status = \'published\'');
    console.log('Posts with null category:', nullCategoryPosts);
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

fixElonMuskPost();
