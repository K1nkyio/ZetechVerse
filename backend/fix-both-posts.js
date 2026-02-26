const { run, get } = require('./src/config/db');

async function fixBothPosts() {
  try {
    console.log('=== FIXING BOTH POSTS ===');
    
    // Fix "Struggles And Success" post - assign to Personal Development category
    const personalDevCategory = await get('SELECT id FROM categories WHERE name = ? AND type = \'blog\' LIMIT 1', ['Personal Development']);
    
    if (personalDevCategory) {
      console.log('Found Personal Development category ID:', personalDevCategory.id);
      
      const result1 = await run(
        'UPDATE blog_posts SET category_id = ? WHERE title = ?',
        [personalDevCategory.id, 'Struggles And Success: Two Sides Of The Same Coin']
      );
      console.log('Struggles post update result:', result1);
    } else {
      console.log('Personal Development category not found!');
    }
    
    // Publish "Elon Musk" post - it's already assigned to Careers but is pending
    const result2 = await run(
      'UPDATE blog_posts SET status = \'published\' WHERE title = ?',
      ['Elon Musk']
    );
    console.log('Elon Musk post publish result:', result2);
    
    // Verify both fixes
    console.log('\\n=== VERIFICATION ===');
    
    const strugglesPost = await get(`
      SELECT 
        p.id,
        p.title,
        p.category_id,
        c.name as category_name,
        p.status
      FROM blog_posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.title LIKE '%Struggles And Success%'
      LIMIT 1
    `);
    
    console.log('STRUGGLES POST AFTER FIX:');
    if (strugglesPost) {
      console.log(`  Title: "${strugglesPost.title}"`);
      console.log(`  Category: "${strugglesPost.category_name}"`);
      console.log(`  Status: "${strugglesPost.status}"`);
    }
    
    const elonPost = await get(`
      SELECT 
        p.id,
        p.title,
        p.category_id,
        c.name as category_name,
        p.status
      FROM blog_posts p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.title LIKE '%Elon Musk%'
      LIMIT 1
    `);
    
    console.log('\\nELON MUSK POST AFTER FIX:');
    if (elonPost) {
      console.log(`  Title: "${elonPost.title}"`);
      console.log(`  Category: "${elonPost.category_name}"`);
      console.log(`  Status: "${elonPost.status}"`);
    }
    
    console.log('\\n✅ Both posts have been fixed!');
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

fixBothPosts();
