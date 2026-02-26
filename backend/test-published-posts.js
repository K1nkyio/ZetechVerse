const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/posts?status=published&limit=100',
  method: 'GET'
};

console.log('Testing API: GET /api/posts?status=published&limit=100\n');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Status Code:', res.statusCode);
      console.log('Success:', json.success);
      console.log('Posts Count:', json.data?.length || 0);
      console.log('\nPost Details:');
      
      if (json.data && json.data.length > 0) {
        json.data.forEach((post, idx) => {
          console.log(`\n${idx + 1}. ${post.title}`);
          console.log(`   ID: ${post.id}`);
          console.log(`   Category: ${post.category_name || 'NULL'}`);
          console.log(`   Status: ${post.status}`);
          console.log(`   Has excerpt: ${!!post.excerpt}`);
          console.log(`   Has content: ${!!post.content}`);
          console.log(`   Content length: ${post.content?.length || 0} chars`);
        });
      } else {
        console.log('No posts returned!');
      }
      
      console.log('\n\nPagination:', JSON.stringify(json.pagination, null, 2));
    } catch (e) {
      console.error('Error parsing JSON:', e);
      console.log('Raw response:', data.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.end();
