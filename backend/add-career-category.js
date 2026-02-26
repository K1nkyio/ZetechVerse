const { run } = require('./src/config/db');

async function addCareerCategory() {
  try {
    console.log('Adding Career category (singular)...');
    
    // Check if Career (singular) already exists
    const existing = await run(
      'SELECT id FROM categories WHERE name = \'Career\' AND type = \'blog\'',
    );
    
    if (!existing) {
      console.log('Creating Career category...');
      await run(
        `INSERT INTO categories (name, slug, description, type, icon, color, is_active, sort_order) 
         VALUES ('Career', 'career', 'Career advice and opportunities', 'blog', 'Briefcase', '#6366f1', 1, 4)`
      );
      console.log('Career category created successfully!');
    } else {
      console.log('Career category already exists');
    }
    
    // Verify all blog categories
    const allBlogCategories = await run('SELECT * FROM categories WHERE type = \'blog\' ORDER BY name');
    console.log('All blog categories now:', allBlogCategories);
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

addCareerCategory();
