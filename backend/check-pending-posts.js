const { get } = require('./src/config/db');

async function checkPendingPosts() {
  try {
    console.log('=== CHECKING PENDING POSTS FOR REVIEW QUEUE ===');
    
    // Check if there are any pending posts
    const pendingPosts = await get(`
      SELECT 
        p.id,
        p.title,
        p.category_id,
        c.name as category_name,
        p.status,
        p.excerpt,
        p.content,
        p.created_at
      FROM blog_posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'pending'
      ORDER BY p.created_at DESC
      LIMIT 5
    `);
    
    console.log('Pending posts for review:');
    if (Array.isArray(pendingPosts)) {
      pendingPosts.forEach(post => {
        console.log(`  "${post.title}" -> ${post.category_name || 'Uncategorized'} (${post.status})`);
        console.log(`    Created: ${post.created_at}`);
        console.log(`    Excerpt: ${post.excerpt ? post.excerpt.substring(0, 100) + '...' : 'No excerpt'}`);
        console.log('');
      });
    } else {
      console.log('No pending posts found');
    }
    
    // Check if there are any published posts (for comparison)
    const publishedPosts = await get(`
      SELECT COUNT(*) as count
      FROM blog_posts 
      WHERE status = 'published'
    `);
    
    console.log(`Published posts count: ${publishedPosts.count}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkPendingPosts();
