const { run, get } = require('./src/config/db');

async function createAllMissingCategories() {
  try {
    console.log('=== CREATING ALL MISSING CATEGORIES ===');
    
    // All admin categories with their database details
    const allCategories = [
      { name: 'Technology', slug: 'technology', description: 'Tech news and tutorials', icon: 'Lightbulb', color: '#3b82f6' },
      { name: 'Design', slug: 'design', description: 'Design articles and resources', icon: 'Palette', color: '#8b5cf6' },
      { name: 'Development', slug: 'development', description: 'Development tutorials and guides', icon: 'Code', color: '#10b981' },
      { name: 'AI & ML', slug: 'ai-ml', description: 'AI and Machine Learning content', icon: 'Cpu', color: '#f59e0b' },
      { name: 'Startup', slug: 'startup', description: 'Startup stories and advice', icon: 'Rocket', color: '#ef4444' },
      { name: 'Careers', slug: 'careers', description: 'Career advice and opportunities', icon: 'Briefcase', color: '#6366f1' },
      { name: 'Tutorial', slug: 'tutorial', description: 'Step-by-step tutorials', icon: 'BookOpen', color: '#84cc16' },
      { name: 'News', slug: 'news', description: 'Latest news and updates', icon: 'Newspaper', color: '#06b6d4' },
      { name: 'Finance', slug: 'finance', description: 'Financial advice and tips', icon: 'DollarSign', color: '#22c55e' },
      { name: 'Health', slug: 'health', description: 'Health and wellness articles', icon: 'Heart', color: '#ec4899' },
      { name: 'Education', slug: 'education', description: 'Educational content', icon: 'GraduationCap', color: '#a855f7' },
      { name: 'Entertainment', slug: 'entertainment', description: 'Entertainment content', icon: 'Music', color: '#f97316' },
      { name: 'Sports', slug: 'sports', description: 'Sports news and events', icon: 'Trophy', color: '#eab308' },
      { name: 'Travel', slug: 'travel', description: 'Travel guides and stories', icon: 'Plane', color: '#14b8a6' },
      { name: 'Food', slug: 'food', description: 'Food and recipes', icon: 'Utensils', color: '#f97316' },
      { name: 'Relationship', slug: 'relationship', description: 'Relationship advice and stories', icon: 'Heart', color: '#ec4899' },
      { name: 'Spirituality', slug: 'spirituality', description: 'Spiritual content and guidance', icon: 'Sparkles', color: '#8b5cf6' },
      { name: 'Gardening', slug: 'gardening', description: 'Gardening tips and guides', icon: 'Flower', color: '#22c55e' },
      { name: 'Cooking', slug: 'cooking', description: 'Cooking recipes and techniques', icon: 'ChefHat', color: '#f97316' },
      { name: 'Beauty', slug: 'beauty', description: 'Beauty tips and tutorials', icon: 'Sparkles', color: '#ec4899' },
      { name: 'Personal Development', slug: 'personal-development', description: 'Personal growth and development', icon: 'Target', color: '#6366f1' },
      { name: 'Mindfulness', slug: 'mindfulness', description: 'Mindfulness and meditation content', icon: 'Brain', color: '#8b5cf6' }
    ];

    let createdCount = 0;
    let existingCount = 0;

    for (const category of allCategories) {
      // Check if category already exists
      const existing = await get('SELECT id FROM categories WHERE name = ? AND type = \'blog\' LIMIT 1', [category.name]);
      
      if (!existing) {
        console.log(`Creating: "${category.name}"`);
        await run(
          `INSERT INTO categories (name, slug, description, type, icon, color, is_active, sort_order) 
           VALUES (?, ?, ?, 'blog', ?, ?, 1, ?)`,
          [category.name, category.slug, category.description, category.icon, category.color, Math.random() * 100]
        );
        createdCount++;
      } else {
        console.log(`Already exists: "${category.name}"`);
        existingCount++;
      }
    }
    
    console.log(`\\n=== SUMMARY ===`);
    console.log(`✅ Created: ${createdCount} new categories`);
    console.log(`📋 Already existed: ${existingCount} categories`);
    console.log(`🎉 Total categories: ${createdCount + existingCount}`);
    
    // Verify all categories now exist
    console.log(`\\n=== VERIFICATION ===`);
    const allBlogCategories = await get('SELECT name FROM categories WHERE type = \'blog\' ORDER BY name');
    console.log(`All blog categories in database:`, allBlogCategories);
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

createAllMissingCategories();
