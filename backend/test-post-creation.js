// Test post creation with proper authentication
const http = require('http');

const postData = JSON.stringify({
  title: 'Test Post from Fixed API',
  content: 'This is a test post to verify the API is working correctly after the response structure fixes.',
  excerpt: 'Test post excerpt',
  category: 'Technology',
  tags: ['test', 'api', 'fixed'],
  status: 'pending'
});

// You'll need to replace this with a real JWT token from your admin login
const token = 'your-jwt-token-here';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/posts',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'Authorization': `Bearer ${token}`
  }
};

console.log('Testing post creation with authentication...');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);

  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      console.log('Response:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.log('Raw response:', body);
    }
  });
});

req.on('error', (e) => {
  console.error(`Request failed: ${e.message}`);
});

req.write(postData);
req.end();