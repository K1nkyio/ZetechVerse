const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/posts/featured?limit=6',
  method: 'GET'
};

console.log('Testing Featured Posts API...\n');

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
      
      if (json.data && json.data.length > 0) {
        console.log('\nFeatured Posts:');
        json.data.forEach((post, idx) => {
          console.log(`${idx + 1}. ${post.title}`);
          console.log(`   Status: ${post.status}`);
          console.log(`   Views: ${post.views_count}`);
          console.log(`   Category: ${post.category_name || 'N/A'}`);
          console.log('');
        });
      } else {
        console.log('No featured posts found!');
        
        // Let's also check regular posts to see what's available
        console.log('\n--- Checking Regular Published Posts ---');
        const regularOptions = {
          hostname: 'localhost',
          port: 3000,
          path: '/api/posts?status=published&limit=10',
          method: 'GET'
        };
        
        const regularReq = http.request(regularOptions, (regRes) => {
          let regData = '';
          regRes.on('data', (chunk) => regData += chunk);
          regRes.on('end', () => {
            try {
              const regJson = JSON.parse(regData);
              console.log('Regular Posts Count:', regJson.data?.length || 0);
              if (regJson.data && regJson.data.length > 0) {
                console.log('\nPublished Posts:');
                regJson.data.forEach((post, idx) => {
                  console.log(`${idx + 1}. ${post.title} (${post.status})`);
                });
              }
            } catch (e) {
              console.error('Error parsing regular posts:', e);
            }
          });
        });
        regularReq.on('error', (e) => console.error('Regular posts request error:', e));
        regularReq.end();
      }
    } catch (e) {
      console.error('Error parsing JSON:', e);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.end();