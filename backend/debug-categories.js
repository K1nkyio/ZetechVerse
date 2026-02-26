const { get } = require('./src/config/db');

async function debugBlogCategories() {
  try {
    console.log('=== DEBUGGING BLOG CATEGORIES ===');
    
    // Get all blog categories
    const allBlogCategories = await get('SELECT * FROM categories WHERE type = \'blog\' ORDER BY name');
    console.log('All blog categories:', allBlogCategories);
    
    // Check specific categories
    const career = await get('SELECT * FROM categories WHERE name = \'Career\' AND type = \'blog\'');
    console.log('Career query result:', career);
    
    const technology = await get('SELECT * FROM categories WHERE name = \'Technology\' AND type = \'blog\'');
    console.log('Technology query result:', technology);
    
    // Check if there are any categories with 'Career' in the name (case insensitive)
    const careerLike = await get('SELECT * FROM categories WHERE name LIKE \'%career%\' AND type = \'blog\'');
    console.log('Career LIKE query result:', careerLike);
    
    // Check all categories with Career in any case
    const careerCase = await get('SELECT * FROM categories WHERE LOWER(name) = LOWER(\'Career\') AND type = \'blog\'');
    console.log('Career case-insensitive query result:', careerCase);
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

debugBlogCategories();
