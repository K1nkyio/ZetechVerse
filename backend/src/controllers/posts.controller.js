const { validationResult } = require('express-validator');
const { run, get, all } = require('../config/db');
const Post = require('../models/Post');
const Notification = require('../models/Notification');

const attachLikedByMe = async (posts, userId) => {
  if (!userId || !Array.isArray(posts) || posts.length === 0) return posts;
  try {
    const ids = posts.map((post) => post.id);
    const placeholders = ids.map(() => '?').join(',');
    const rows = await all(
      `SELECT blog_post_id FROM blog_post_likes WHERE user_id = ? AND blog_post_id IN (${placeholders})`,
      [userId, ...ids]
    );
    const likedSet = new Set(rows.map((row) => String(row.blog_post_id)));
    return posts.map((post) => ({
      ...post,
      likedByMe: likedSet.has(String(post.id))
    }));
  } catch (error) {
    console.error('Failed to attach likedByMe for posts:', error);
    return posts;
  }
};

const ensureBlogLikesSchema = async () => {
  const postsTable = await get(`
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_name = 'blog_posts'
    LIMIT 1
  `);
  if (!postsTable) {
    throw new Error('blog_posts table is missing');
  }

  await run(`
    CREATE TABLE IF NOT EXISTS blog_post_likes (
      id SERIAL PRIMARY KEY,
      blog_post_id INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(blog_post_id, user_id)
    )
  `);
  await run('CREATE INDEX IF NOT EXISTS idx_blog_post_likes_post ON blog_post_likes(blog_post_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_blog_post_likes_user ON blog_post_likes(user_id)');

  const likesCountColumn = await get(`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'blog_posts'
      AND column_name = 'likes_count'
    LIMIT 1
  `);
  if (!likesCountColumn) {
    await run('ALTER TABLE blog_posts ADD COLUMN likes_count INTEGER DEFAULT 0');
  }
};

// Get all posts
const getPosts = async (req, res) => {
  try {
    console.log('🎯 GET POSTS REQUEST');
    console.log('Query params:', req.query);
    console.log('User:', req.user);
    
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      status: req.query.status || 'published',
      category: req.query.category,
      search: req.query.search,
      sort_by: req.query.sort_by || 'created_at',
      sort_order: req.query.sort_order || 'DESC'
    };

    console.log('Query options:', options);

    const result = await Post.findAll(options);
    const postsWithLikes = await attachLikedByMe(result.posts, req.user?.id);
    
    console.log('Result:', { postsCount: postsWithLikes.length, pagination: result.pagination });

    res.json({
      success: true,
      data: postsWithLikes,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch posts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single post by ID
const getPost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Increment view count
    await Post.incrementViews(id);

    const likedRows = req.user
      ? await all('SELECT blog_post_id FROM blog_post_likes WHERE user_id = ? AND blog_post_id = ?', [req.user.id, id])
      : [];
    const likedByMe = likedRows.length > 0;

    res.json({
      success: true,
      data: {
        ...post,
        likedByMe
      }
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create a new post
const createPost = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const mappedErrors = errors.array().map((err) => ({
        field: err.path || err.param || 'unknown',
        message: err.msg || err.message || 'Validation failed',
        value: err.value
      }));
      console.log('Post validation failed:', mappedErrors);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: mappedErrors
      });
    }

    const { title, content, excerpt, category, tags, featured_image, video_url, status } = req.body;

    const postData = {
      title: title.trim(),
      content: content.trim(),
      excerpt: excerpt?.trim(),
      category,
      tags,
      featured_image,
      video_url,
      status: status || 'draft',
      author_id: req.user.id
    };

    const postId = await Post.create(postData);
    const post = await Post.findById(postId);

    // Trigger notification if post is published
    if (postData.status === 'published') {
      try {
        await Notification.createSystemNotification(
          'posts',
          'New Blog Post Published',
          `A new blog post titled "${postData.title}" has been published. Check it out now!`,
          postId
        );
      } catch (notificationError) {
        console.error('Failed to create notification for new post:', notificationError);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: post
    });
  } catch (error) {
    console.error('Error creating post:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to create post',
      error: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Update a post
const updatePost = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const mappedErrors = errors.array().map((err) => ({
        field: err.path || err.param || 'unknown',
        message: err.msg || err.message || 'Validation failed',
        value: err.value
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: mappedErrors
      });
    }

    const { id } = req.params;
    const { title, content, excerpt, tags, featured_image, video_url, status } = req.body;

    // Check if post exists
    const existingPost = await Post.findById(id);
    if (!existingPost) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user owns the post or is admin
    if (existingPost.author_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this post'
      });
    }

    const updateData = {
      title: title?.trim(),
      content: content?.trim(),
      excerpt: excerpt?.trim(),
      tags,
      featured_image,
      video_url,
      status
    };

    await Post.update(id, updateData);
    const updatedPost = await Post.findById(id);

    res.json({
      success: true,
      message: 'Post updated successfully',
      data: updatedPost
    });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete a post
const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user owns the post or is admin
    if (post.author_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this post'
      });
    }

    await Post.delete(id);

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get featured posts
const getFeaturedPosts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const result = await Post.findFeatured(limit);
    const postsWithLikes = await attachLikedByMe(result.posts, req.user?.id);

    res.json({
      success: true,
      data: postsWithLikes
    });
  } catch (error) {
    console.error('Error fetching featured posts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured posts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get posts by category
const getPostsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      status: 'published',
      category,
      sort_by: req.query.sort_by || 'created_at',
      sort_order: req.query.sort_order || 'DESC'
    };

    const result = await Post.findAll(options);
    const postsWithLikes = await attachLikedByMe(result.posts, req.user?.id);

    res.json({
      success: true,
      data: postsWithLikes,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching posts by category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch posts by category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get user's posts (for admin dashboard)
const getMyPosts = async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      author_id: req.user.id,
      status: req.query.status, // Allow filtering by status, or show all if not specified
      sort_by: req.query.sort_by || 'created_at',
      sort_order: req.query.sort_order || 'DESC'
    };

    const result = await Post.findAll(options);

    res.json({
      success: true,
      data: result.posts,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your posts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get post categories
const getCategories = async (req, res) => {
  try {
    const categories = await Post.getCategories();

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get pending posts for review queue (super admin only)
const getReviewQueue = async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      status: 'pending', // Only show pending posts
      sort_by: req.query.sort_by || 'created_at',
      sort_order: req.query.sort_order || 'DESC'
    };

    const result = await Post.findAll(options);

    res.json({
      success: true,
      data: result.posts,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching review queue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch review queue',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Approve or reject a post (super admin only)
const reviewPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "approve" or "reject"'
      });
    }

    // Check if post exists and is pending
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Post is not in pending status'
      });
    }

    const newStatus = action === 'approve' ? 'published' : 'rejected';

    await Post.update(id, { status: newStatus });
    const updatedPost = await Post.findById(id);

    // Trigger notification if post is approved/published
    if (action === 'approve') {
      try {
        await Notification.createSystemNotification(
          'posts',
          'New Blog Post Published',
          `A new blog post titled "${updatedPost.title}" has been approved and published. Check it out now!`,
          id
        );
        
        // Notify the author specifically
        if (updatedPost.author_id) {
          await Notification.notifyUser(
            updatedPost.author_id,
            'personal',
            'Your Post Has Been Approved',
            `Your blog post titled "${updatedPost.title}" has been approved and is now published!`,
            id
          );
        }
      } catch (notificationError) {
        console.error('Failed to create notification for approved post:', notificationError);
      }
    } else if (action === 'reject') {
      // Notify the author when post is rejected
      try {
        if (updatedPost.author_id) {
          await Notification.notifyUser(
            updatedPost.author_id,
            'personal',
            'Your Post Has Been Rejected',
            `Your blog post titled "${updatedPost.title}" has been rejected. Please review and resubmit.`,
            id
          );
        }
      } catch (notificationError) {
        console.error('Failed to create notification for rejected post:', notificationError);
      }
    }

    res.json({
      success: true,
      message: `Post ${action}d successfully`,
      data: updatedPost
    });
  } catch (error) {
    console.error('Error reviewing post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Like/unlike a post
const togglePostLike = async (req, res) => {
  try {
    await ensureBlogLikesSchema();
    const { id } = req.params;
    const userId = req.user.id;

    const post = await get('SELECT id FROM blog_posts WHERE id = ?', [id]);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const existingLike = await get('SELECT id FROM blog_post_likes WHERE blog_post_id = ? AND user_id = ?', [id, userId]);
    let liked = false;

    if (existingLike) {
      await run('DELETE FROM blog_post_likes WHERE blog_post_id = ? AND user_id = ?', [id, userId]);
    } else {
      await run('INSERT INTO blog_post_likes (blog_post_id, user_id) VALUES (?, ?)', [id, userId]);
      liked = true;
    }

    const updated = await get(
      'SELECT COUNT(*)::INTEGER as likes_count FROM blog_post_likes WHERE blog_post_id = ?',
      [id]
    );
    const likesCount = Number(updated?.likes_count || 0);
    await run('UPDATE blog_posts SET likes_count = ? WHERE id = ?', [likesCount, id]);

    res.json({
      success: true,
      message: liked ? 'Post liked successfully' : 'Post unliked successfully',
      liked,
      likes_count: likesCount,
      data: {
        liked,
        likes_count: likesCount
      }
    });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to like post',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  getFeaturedPosts,
  getPostsByCategory,
  getMyPosts,
  getCategories,
  getReviewQueue,
  reviewPost,
  togglePostLike
};
