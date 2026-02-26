const { run, get } = require('./src/config/db');

async function createTestPendingPost() {
  try {
    console.log('=== CREATING TEST PENDING POST ===');
    
    // Get a category ID
    const techCategory = await get('SELECT id FROM categories WHERE name = ? AND type = \'blog\' LIMIT 1', ['Technology']);
    
    if (techCategory) {
      console.log('Using Technology category ID:', techCategory.id);
      
      // Create a test pending post
      const result = await run(`
        INSERT INTO blog_posts (
          title, 
          slug,
          content, 
          excerpt, 
          category_id, 
          author_id, 
          status, 
          created_at, 
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
        'Test Post for Review Queue',
        'test-post-for-review-queue',
        'This is a test post content for the review queue functionality. It contains sample content that can be edited during the review process.',
        'This is a test excerpt for the review queue post.',
        techCategory.id,
        1, // Assuming author_id = 1 exists
        'pending'
      ]);
      
      console.log('Test post created with result:', result);
      
      // Verify the post was created
      const newPost = await get(`
        SELECT 
          p.id,
          p.title,
          p.category_id,
          c.name as category_name,
          p.status,
          p.created_at
        FROM blog_posts p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.title = ?
      `, ['Test Post for Review Queue']);
      
      if (newPost) {
        console.log('✅ Test post created successfully:');
        console.log(`  ID: ${newPost.id}`);
        console.log(`  Title: "${newPost.title}"`);
        console.log(`  Category: "${newPost.category_name}"`);
        console.log(`  Status: "${newPost.status}"`);
        console.log(`  Created: ${newPost.created_at}`);
      }
    } else {
      console.log('Technology category not found!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

createTestPendingPost();
