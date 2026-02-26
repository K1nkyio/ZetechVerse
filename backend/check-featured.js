const { all } = require('./src/config/db');

async function checkFeatured() {
  try {
    const featuredPosts = await all('SELECT id, title, featured FROM blog_posts WHERE featured = 1');
    console.log('Featured posts (featured = 1):', featuredPosts.length);
    featuredPosts.forEach(post => console.log(`- ${post.title}`));
    
    const nullFeatured = await all('SELECT id, title, featured FROM blog_posts WHERE featured IS NULL');
    console.log('Posts with NULL featured:', nullFeatured.length);
    nullFeatured.forEach(post => console.log(`- ${post.title} (${post.featured})`));
    
    const zeroFeatured = await all('SELECT id, title, featured FROM blog_posts WHERE featured = 0');
    console.log('Posts with featured = 0:', zeroFeatured.length);
    
  } catch (e) {
    console.error('Error:', e);
  }
}

checkFeatured();