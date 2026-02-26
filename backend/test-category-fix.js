const { get } = require('./src/config/db');

async function testCategoryFix() {
  try {
    console.log('=== TESTING CATEGORY FIX ===');
    
    // Test the exact query that Post.create uses for "Relationship"
    const relationshipResult = await get(
      'SELECT id FROM categories WHERE name = ? AND type = \'blog\' LIMIT 1',
      ['Relationship']
    );
    console.log('Relationship query result:', relationshipResult);
    
    // Test other categories that were missing
    const testCategories = ['Personal Development', 'Travel', 'Food', 'Beauty'];
    
    for (const category of testCategories) {
      const result = await get(
        'SELECT id FROM categories WHERE name = ? AND type = \'blog\' LIMIT 1',
        [category]
      );
      console.log(`${category} query result:`, result ? `ID ${result.id}` : 'NOT FOUND');
    }
    
    // Check if there are any posts with null categories that need fixing
    const nullCategoryPosts = await get(`
      SELECT id, title, category_id
      FROM blog_posts 
      WHERE category_id IS NULL AND status = 'published'
      LIMIT 5
    `);
    
    console.log('Posts with null categories:', nullCategoryPosts);
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

testCategoryFix();
