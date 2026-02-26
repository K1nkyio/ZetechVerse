const { all } = require('./src/config/db');

async function checkViews() {
  try {
    const posts = await all('SELECT id, title, views_count FROM blog_posts WHERE status = "published" ORDER BY views_count DESC');
    console.log('Published posts sorted by views:');
    posts.forEach((post, idx) => {
      console.log(`${idx + 1}. ${post.title} (${post.views_count} views)`);
    });
  } catch (e) {
    console.error('Error:', e);
  }
}

checkViews();