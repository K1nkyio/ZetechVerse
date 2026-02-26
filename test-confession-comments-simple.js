// Simple browser console test for confession comment workflow
// Copy and paste this into your browser's developer console

function testConfessionComments() {
  console.log('Testing confession comment workflow...');
  
  const token = localStorage.getItem('auth_token');
  if (!token) {
    console.error('No auth token found. Please login to admin dashboard first.');
    return;
  }
  
  const API_BASE_URL = 'http://localhost:3000';
  
  // Test confession comments API
  fetch(API_BASE_URL + '/confessions/admin/comments?limit=10&status=all', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(response => {
    console.log('Confession comments response status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('Confession comments data:', data);
    if (data.success && data.data) {
      console.log('Found ' + data.data.length + ' confession comments');
      if (data.data.length > 0) {
        console.log('Sample comment:', {
          id: data.data[0].id,
          content: data.data[0].content,
          status: data.data[0].status,
          author: data.data[0].author_username || 'Anonymous'
        });
      }
    }
  })
  .catch(error => {
    console.error('Error fetching confession comments:', error);
  });
  
  // Test marketplace comments API for comparison
  fetch(API_BASE_URL + '/marketplace-comments/admin/comments?limit=10', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(response => response.json())
  .then(data => {
    console.log('Marketplace comments data:', data);
    if (data.success && data.data) {
      console.log('Found ' + data.data.length + ' marketplace comments');
    }
  })
  .catch(error => {
    console.error('Error fetching marketplace comments:', error);
  });
}

// Run the test
testConfessionComments();