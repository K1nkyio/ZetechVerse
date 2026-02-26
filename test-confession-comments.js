// Test script to verify confession comment workflow
// This can be run in browser console or as a test

async function testConfessionCommentWorkflow() {
  console.log('🧪 Testing Confession Comment Workflow...\n');
  
  const API_BASE_URL = 'http://localhost:3000';
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    console.error('❌ No auth token found. Please login first.');
    return;
  }
  
  try {
    // 1. Test fetching confession comments for moderation
    console.log('1. Fetching confession comments for moderation...');
    const confessionCommentsResponse = await fetch(`${API_BASE_URL}/confessions/admin/comments?limit=10&status=all`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (confessionCommentsResponse.ok) {
      const confessionData = await confessionCommentsResponse.json();
      console.log('✅ Confession comments API working');
      console.log('📊 Found', confessionData.data?.length || 0, 'confession comments');
      
      if (confessionData.data && confessionData.data.length > 0) {
        console.log('📋 Sample confession comment:', {
          id: confessionData.data[0].id,
          content: confessionData.data[0].content.substring(0, 50) + '...',
          status: confessionData.data[0].status,
          author: confessionData.data[0].author_username || 'Anonymous'
        });
      }
    } else {
      console.error('❌ Failed to fetch confession comments:', confessionCommentsResponse.status);
    }
    
    // 2. Test fetching marketplace comments for comparison
    console.log('\n2. Fetching marketplace comments for comparison...');
    const marketplaceResponse = await fetch(`${API_BASE_URL}/marketplace-comments/admin/comments?limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (marketplaceResponse.ok) {
      const marketplaceData = await marketplaceResponse.json();
      console.log('✅ Marketplace comments API working');
      console.log('📊 Found', marketplaceData.data?.length || 0, 'marketplace comments');
    } else {
      console.error('❌ Failed to fetch marketplace comments:', marketplaceResponse.status);
    }
    
    // 3. Test unified comment manager data structure
    console.log('\n3. Testing unified comment structure...');
    
    let allComments = [];
    
    // Process confession comments
    if (confessionCommentsResponse.ok) {
      const confessionData = await confessionCommentsResponse.json();
      if (confessionData.success && confessionData.data) {
        const confessionComments = confessionData.data.map(function(comment) {
          return {
            id: comment.id,
            content: comment.content,
            entity_type: 'confession',
            entity_id: comment.confession_id,
            entity_title: comment.confession_content ? 'Confession: ' + comment.confession_content.substring(0, 50) + '...' : 'Confession Comment',
            user_id: comment.user_id,
            author_username: comment.author_username || 'Anonymous',
            author_full_name: comment.author_full_name,
            is_anonymous: comment.is_anonymous === 1 || comment.is_anonymous === true,
            status: comment.status,
            created_at: comment.created_at,
            moderated_by: comment.moderated_by_username,
            moderated_at: comment.moderated_at
          };
        });
        allComments = [...allComments, ...confessionComments];
        console.log('✅ Processed', confessionComments.length, 'confession comments');
      }
    }
    
    // Process marketplace comments
    if (marketplaceResponse.ok) {
      const marketplaceData = await marketplaceResponse.json();
      if (marketplaceData.success && marketplaceData.data) {
        const marketplaceComments = marketplaceData.data.map(function(comment) {
          id: comment.id,
          content: comment.content,
          entity_type: 'marketplace',
          entity_id: comment.listing_id,
          entity_title: comment.listing_title,
          user_id: comment.user_id,
          author_username: comment.username,
          author_full_name: comment.full_name,
          status: comment.status,
          created_at: comment.created_at,
          updated_at: comment.updated_at,
          moderated_by: comment.moderated_by,
          moderated_at: comment.moderated_at,
          likes_count: comment.likes_count,
          parent_comment_id: comment.parent_comment_id
        }));
        allComments = [...allComments, ...marketplaceComments];
        console.log('✅ Processed', marketplaceComments.length, 'marketplace comments');
      }
    }
    
    console.log('\n📊 Total unified comments:', allComments.length);
    
    // Show statistics
    const confessionCount = allComments.filter(c => c.entity_type === 'confession').length;
    const marketplaceCount = allComments.filter(c => c.entity_type === 'marketplace').length;
    const pendingCount = allComments.filter(c => c.status === 'pending').length;
    
    console.log('📈 Statistics:');
    console.log('  - Confession comments:', confessionCount);
    console.log('  - Marketplace comments:', marketplaceCount);
    console.log('  - Pending comments:', pendingCount);
    
    // Show sample of each type
    console.log('\n📋 Sample comments by type:');
    const confessionSample = allComments.find(c => c.entity_type === 'confession');
    const marketplaceSample = allComments.find(c => c.entity_type === 'marketplace');
    
    if (confessionSample) {
      console.log('Confession Comment Sample:', {
        content: confessionSample.content.substring(0, 100) + '...',
        author: confessionSample.author_username,
        status: confessionSample.status
      });
    }
    
    if (marketplaceSample) {
      console.log('Marketplace Comment Sample:', {
        content: marketplaceSample.content.substring(0, 100) + '...',
        author: marketplaceSample.author_username,
        status: marketplaceSample.status
      });
    }
    
    console.log('\n✅ Confession comment workflow test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testConfessionCommentWorkflow();