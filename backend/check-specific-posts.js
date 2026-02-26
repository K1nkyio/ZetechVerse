const { get } = require('./src/config/db');

async function checkSpecificPosts() {
  try {
    console.log('=== CHECKING SPECIFIC POSTS ===');
    
    // Check the "Struggles And Success" post
    const strugglesPost = await get(`
      SELECT 
        p.id,
        p.title,
        p.category_id,
        c.name as category_name,
        p.status,
        p.created_at
      FROM blog_posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.title LIKE '%Struggles And Success%'
      LIMIT 1
    `);
    
    console.log('STRUGGLES POST:');
    if (strugglesPost) {
      console.log(`  Title: "${strugglesPost.title}"`);
      console.log(`  Category ID: ${strugglesPost.category_id}`);
      console.log(`  Category Name: "${strugglesPost.category_name}"`);
      console.log(`  Status: "${strugglesPost.status}"`);
      console.log(`  Created: ${strugglesPost.created_at}`);
    }
    
    // Check the "Elon Musk" post
    const elonPost = await get(`
      SELECT 
        p.id,
        p.title,
        p.category_id,
        c.name as category_name,
        p.status,
        p.created_at
      FROM blog_posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.title LIKE '%Elon Musk%'
      LIMIT 1
    `);
    
    console.log('\\nELON MUSK POST:');
    if (elonPost) {
      console.log(`  Title: "${elonPost.title}"`);
      console.log(`  Category ID: ${elonPost.category_id}`);
      console.log(`  Category Name: "${elonPost.category_name}"`);
      console.log(`  Status: "${elonPost.status}"`);
      console.log(`  Created: ${elonPost.created_at}`);
    }
    
    // Check if there are posts that might have been created with wrong categories
    const techPosts = await get(`
      SELECT 
        p.id,
        p.title,
        p.category_id,
        c.name as category_name
      FROM blog_posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE c.name = 'Technology' AND p.status = 'published'
      ORDER BY p.created_at DESC
      LIMIT 5
    `);
    
    console.log('\\nPOSTS ASSIGNED TO TECHNOLOGY:');
    if (Array.isArray(techPosts)) {
      techPosts.forEach(post => {
        console.log(`  "${post.title}" -> ${post.category_name}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkSpecificPosts();
