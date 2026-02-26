const { all } = require('./src/config/db');

async function finalCheck() {
  try {
    console.log('=== FINAL CATEGORY CHECK ===');
    
    // Get all blog categories
    const allBlogCategories = await all('SELECT id, name FROM categories WHERE type = \'blog\' ORDER BY name');
    console.log('All blog categories raw result:', allBlogCategories);
    
    if (Array.isArray(allBlogCategories)) {
      allBlogCategories.forEach(cat => {
        console.log(`  ID: ${cat.id}, Name: "${cat.name}"`);
      });
    }
    
    // Test the exact query that Post.create uses
    const careerResult = await all('SELECT id FROM categories WHERE name = ? AND type = \'blog\' LIMIT 1', ['Career']);
    console.log('Career query result (exact):', careerResult);
    
    const technologyResult = await all('SELECT id FROM categories WHERE name = ? AND type = \'blog\' LIMIT 1', ['Technology']);
    console.log('Technology query result (exact):', technologyResult);
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

finalCheck();
