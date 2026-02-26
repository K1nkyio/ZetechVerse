const { get } = require('./src/config/db');

async function investigateSpecificPost() {
  try {
    console.log('=== INVESTIGATING SPECIFIC POST ISSUE ===');
    
    // Look for the specific post mentioned
    const divorcePost = await get(`
      SELECT 
        p.id,
        p.title,
        p.category_id,
        c.name as category_name,
        c.type as category_type
      FROM blog_posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.title LIKE '%Divorce%' OR p.title LIKE '%Predictor%'
      LIMIT 1
    `);
    
    if (divorcePost) {
      console.log('FOUND THE POST:');
      console.log(`  Title: "${divorcePost.title}"`);
      console.log(`  Category ID: ${divorcePost.category_id}`);
      console.log(`  Category Name: "${divorcePost.category_name}"`);
      console.log(`  Category Type: "${divorcePost.category_type}"`);
    } else {
      console.log('Post not found. Let me check all recent posts...');
      
      // Get all recent posts to see the pattern
      const allPosts = await get(`
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
      
      console.log('All recent posts:');
      if (Array.isArray(allPosts)) {
        allPosts.forEach(post => {
          console.log(`  "${post.title}" -> ${post.category_name || 'NULL'}`);
        });
      }
    }
    
    // Check if Relationship category actually exists
    const relationshipCategory = await get('SELECT id, name, type FROM categories WHERE name = ? LIMIT 1', ['Relationship']);
    console.log('\\nRelationship category check:', relationshipCategory);
    
    // Check if it exists with type = 'blog'
    const relationshipBlogCategory = await get('SELECT id, name, type FROM categories WHERE name = ? AND type = \'blog\' LIMIT 1', ['Relationship']);
    console.log('Relationship blog category check:', relationshipBlogCategory);
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

investigateSpecificPost();
