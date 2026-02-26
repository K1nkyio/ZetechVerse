const { get, run } = require('./src/config/db');

async function checkSpecificPostStatus() {
  try {
    console.log('=== CHECKING SPECIFIC POST STATUS ===');
    
    // Check the specific post regardless of status
    const specificPost = await get(`
      SELECT 
        p.id,
        p.title,
        p.status,
        p.category_id,
        c.name as category_name,
        p.created_at
      FROM blog_posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.title LIKE '%Divorce%' OR p.title LIKE '%Predictor%'
      LIMIT 1
    `);
    
    if (specificPost) {
      console.log('POST FOUND:');
      console.log(`  Title: "${specificPost.title}"`);
      console.log(`  Status: "${specificPost.status}"`);
      console.log(`  Category: "${specificPost.category_name}"`);
      console.log(`  Created: ${specificPost.created_at}`);
      
      if (specificPost.status !== 'published') {
        console.log('\\n⚠️  POST IS NOT PUBLISHED! This is why it\'s not showing in the Explore section.');
        console.log('Let me publish it...');
        
        // Publish the post
        await run('UPDATE blog_posts SET status = \'published\' WHERE id = ?', [specificPost.id]);
        console.log('✅ Post has been published!');
        
        // Verify
        const publishedPost = await get('SELECT status FROM blog_posts WHERE id = ?', [specificPost.id]);
        console.log(`New status: "${publishedPost.status}"`);
      }
    } else {
      console.log('Post not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkSpecificPostStatus();
