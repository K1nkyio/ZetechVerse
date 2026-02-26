const { get } = require('./src/config/db');

async function checkCategories() {
  try {
    console.log('Checking blog categories...');
    
    const blogCategories = await get('SELECT * FROM categories WHERE type = \'blog\'');
    console.log('Blog categories in database:', blogCategories);
    
    const allCategories = await get('SELECT * FROM categories');
    console.log('All categories:', allCategories);
    
    // Check for specific category names
    const techCategory = await get('SELECT * FROM categories WHERE name = \'Technology\' AND type = \'blog\'');
    console.log('Technology category:', techCategory);
    
    const careerCategory = await get('SELECT * FROM categories WHERE name = \'Career\' AND type = \'blog\'');
    console.log('Career category:', careerCategory);
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkCategories();
