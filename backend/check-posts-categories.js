const { all } = require('./src/config/db');

async function checkPostsWithCategories() {
  try {
    console.log('=== CHECKING POSTS WITH CATEGORIES ===');
    
    // Get recent posts with their categories
    const posts = await all(`
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
      LIMIT 5
    `);
    
    console.log('Recent posts raw result:', posts);
    
    if (Array.isArray(posts)) {
      console.log('Recent posts:');
      posts.forEach(post => {
        console.log(`  Post ID: ${post.id}`);
        console.log(`  Title: "${post.title}"`);
        console.log(`  Category ID: ${post.category_id}`);
        console.log(`  Category Name: "${post.category_name}"`);
        console.log(`  Category Type: "${post.category_type}"`);
        console.log('---');
      });
    }
    
    // Check specifically for Elon Musk post
    const elonPost = await all(`
      SELECT 
        p.id,
        p.title,
        p.category_id,
        c.name as category_name,
        c.type as category_type
      FROM blog_posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.title LIKE '%Elon%' OR p.title LIKE '%Musk%'
      LIMIT 1
    `);
    
    if (elonPost && elonPost.length > 0) {
      console.log('ELON MUSK POST FOUND:');
      console.log(`  Post ID: ${elonPost[0].id}`);
      console.log(`  Title: "${elonPost[0].title}"`);
      console.log(`  Category ID: ${elonPost[0].category_id}`);
      console.log(`  Category Name: "${elonPost[0].category_name}"`);
      console.log(`  Category Type: "${elonPost[0].category_type}"`);
    } else {
      console.log('No Elon Musk post found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkPostsWithCategories();
