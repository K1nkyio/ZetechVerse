const { run } = require('./src/config/db');

async function createMissingBlogCategories() {
  try {
    console.log('Creating missing blog categories...');
    
    const blogCategories = [
      { name: 'Technology', slug: 'technology', description: 'Tech news and tutorials', icon: 'Lightbulb', color: '#3b82f6' },
      { name: 'Design', slug: 'design', description: 'Design articles and resources', icon: 'Palette', color: '#8b5cf6' },
      { name: 'Development', slug: 'development', description: 'Development tutorials and guides', icon: 'Code', color: '#10b981' },
      { name: 'AI & ML', slug: 'ai-ml', description: 'AI and Machine Learning content', icon: 'Cpu', color: '#f59e0b' },
      { name: 'Startup', slug: 'startup', description: 'Startup stories and advice', icon: 'Rocket', color: '#ef4444' },
      { name: 'Career', slug: 'career', description: 'Career advice and opportunities', icon: 'Briefcase', color: '#6366f1' },
      { name: 'Tutorial', slug: 'tutorial', description: 'Step-by-step tutorials', icon: 'BookOpen', color: '#84cc16' },
      { name: 'News', slug: 'news', description: 'Latest news and updates', icon: 'Newspaper', color: '#06b6d4' },
      { name: 'Finance', slug: 'finance', description: 'Financial advice and tips', icon: 'DollarSign', color: '#22c55e' },
      { name: 'Health', slug: 'health', description: 'Health and wellness articles', icon: 'Heart', color: '#ec4899' },
      { name: 'Education', slug: 'education', description: 'Educational content', icon: 'GraduationCap', color: '#a855f7' },
      { name: 'Entertainment', slug: 'entertainment', description: 'Entertainment content', icon: 'Music', color: '#f97316' },
      { name: 'Sports', slug: 'sports', description: 'Sports news and events', icon: 'Trophy', color: '#eab308' },
      { name: 'Travel', slug: 'travel', description: 'Travel guides and stories', icon: 'Plane', color: '#14b8a6' },
      { name: 'Food', slug: 'food', description: 'Food and recipes', icon: 'Utensils', color: '#f97316' }
    ];

    for (const category of blogCategories) {
      // Check if category already exists
      const existing = await run(
        'SELECT id FROM categories WHERE name = ? AND type = \'blog\'',
        [category.name]
      );
      
      if (!existing) {
        console.log(`Creating category: ${category.name}`);
        await run(
          `INSERT INTO categories (name, slug, description, type, icon, color, is_active, sort_order) 
           VALUES (?, ?, ?, 'blog', ?, ?, 1, ?)`,
          [category.name, category.slug, category.description, category.icon, category.color, Math.random() * 100]
        );
      } else {
        console.log(`Category already exists: ${category.name}`);
      }
    }
    
    console.log('Blog categories creation completed!');
    
  } catch (error) {
    console.error('Error creating categories:', error);
  }
  process.exit(0);
}

createMissingBlogCategories();
