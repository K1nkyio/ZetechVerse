const { get } = require('./src/config/db');

async function checkMissingCategories() {
  try {
    console.log('=== CHECKING MISSING CATEGORIES ===');
    
    // Categories that admin dashboard sends but might not exist in database
    const adminCategories = [
      "Technology",
      "Design", 
      "Development",
      "AI & ML",
      "Startup",
      "Careers",
      "Tutorial",
      "News",
      "Finance",
      "Health",
      "Education",
      "Entertainment",
      "Sports",
      "Travel",
      "Food",
      "Relationship",
      "Spirituality",
      "Gardening",
      "Cooking",
      "Beauty",
      "Personal Development",
      "Mindfulness",
    ];
    
    console.log('Checking admin categories against database...');
    
    for (const category of adminCategories) {
      const result = await get('SELECT id, name FROM categories WHERE name = ? AND type = \'blog\' LIMIT 1', [category]);
      
      if (result) {
        console.log(`✅ Found: "${category}" (ID: ${result.id})`);
      } else {
        console.log(`❌ Missing: "${category}" - This will cause posts to default to Technology!`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkMissingCategories();
