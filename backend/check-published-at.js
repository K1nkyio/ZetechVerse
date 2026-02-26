const { all } = require('./src/config/db');

async function checkPublishedAt() {
  try {
    const posts = await all('SELECT id, title, published_at, created_at FROM blog_posts WHERE status = "published" ORDER BY published_at DESC');
    console.log('Published posts sorted by published_at:');
    posts.forEach((post, idx) => {
      console.log(`${idx + 1}. ${post.title}`);
      console.log(`   Published: ${post.published_at}`);
      console.log(`   Created: ${post.created_at}`);
      console.log('');
    });
  } catch (e) {
    console.error('Error:', e);
  }
}

checkPublishedAt();