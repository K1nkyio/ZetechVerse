const db = require('../config/db');
const { body, validationResult } = require('express-validator');

/**
 * Track lightweight frontend analytics events (best-effort, no auth required)
 */
exports.trackEvent = async (req, res) => {
  try {
    const { name, payload, timestamp } = req.body || {};

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Event name is required'
      });
    }

    const eventTime = timestamp ? new Date(timestamp) : new Date();
    const createdAt = Number.isNaN(eventTime.getTime()) ? new Date().toISOString() : eventTime.toISOString();

    const forwardedFor = req.headers['x-forwarded-for'];
    const ipAddress = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : req.ip);

    await db.run(
      `INSERT INTO activity_logs (user_id, action, entity_type, description, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        null,
        String(name).slice(0, 100),
        'analytics_event',
        payload ? JSON.stringify(payload).slice(0, 4000) : null,
        ipAddress || null,
        req.headers['user-agent'] || null,
        createdAt
      ]
    );

    return res.status(202).json({
      success: true,
      message: 'Event queued'
    });
  } catch (error) {
    console.error('Error tracking analytics event:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to track analytics event'
    });
  }
};

/**
 * Get platform analytics
 */
exports.getAnalytics = async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    
    // Get total users
    const totalUsersResult = await db.get('SELECT COUNT(*) as count FROM users');
    const totalUsers = totalUsersResult.count;

    // Get total posts
    const totalPostsResult = await db.get('SELECT COUNT(*) as count FROM blog_posts WHERE status = ?', ['published']);
    const totalPosts = totalPostsResult.count;

    // Get total views (sum of all posts' view counts)
    const totalViewsResult = await db.get('SELECT SUM(views_count) as total_views FROM blog_posts');
    const totalViews = totalViewsResult.total_views || 0;

    // Get total comments
    const totalCommentsResult = await db.get('SELECT (SELECT COUNT(*) FROM blog_post_comments) + (SELECT COUNT(*) FROM confession_comments) + (SELECT COUNT(*) FROM marketplace_comments) as count');
    const totalComments = totalCommentsResult.count;

    // Get total likes across major content types
    const totalLikesResult = await db.get(`
      SELECT
        COALESCE((SELECT SUM(likes_count) FROM blog_posts), 0) +
        COALESCE((SELECT SUM(likes_count) FROM events), 0) +
        COALESCE((SELECT SUM(likes_count) FROM confessions), 0) +
        COALESCE((SELECT SUM(likes_count) FROM marketplace_listings), 0) as count
    `);
    const totalLikes = Number(totalLikesResult?.count || 0);

    // Shares are currently tracked on confessions and opportunities
    const totalSharesResult = await db.get(`
      SELECT
        COALESCE((SELECT SUM(shares_count) FROM confessions), 0) +
        COALESCE((SELECT SUM(applications_count) FROM opportunities), 0) as count
    `);
    const totalShares = Number(totalSharesResult?.count || 0);

    // Get active users (users who commented or posted in the last period)
    const activePeriod = getPeriodDate(range);
    const activeUsersResult = await db.get(
      `SELECT COUNT(DISTINCT user_id) as count 
       FROM (
         SELECT DISTINCT author_id as user_id FROM blog_posts WHERE created_at >= ?
         UNION
         SELECT DISTINCT author_id as user_id FROM confessions WHERE created_at >= ?
         UNION
         SELECT DISTINCT user_id FROM blog_post_comments WHERE created_at >= ?
         UNION
         SELECT DISTINCT user_id FROM confession_comments WHERE created_at >= ?
         UNION
         SELECT DISTINCT user_id FROM marketplace_comments WHERE created_at >= ?
       )`, 
      [activePeriod, activePeriod, activePeriod, activePeriod, activePeriod]
    );
    const activeUsers = activeUsersResult.count;

    // Get weekly growth rate
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const usersLastWeekResult = await db.get('SELECT COUNT(*) as count FROM users WHERE created_at >= ?', [weekAgo]);
    const usersBeforeWeekResult = await db.get('SELECT COUNT(*) as count FROM users WHERE created_at < ? AND created_at >= ?', 
      [weekAgo, new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()]);
    
    const usersLastWeek = usersLastWeekResult.count;
    const usersBeforeWeek = usersBeforeWeekResult.count;
    const weeklyGrowth = usersBeforeWeek > 0 ? ((usersLastWeek - usersBeforeWeek) / usersBeforeWeek) * 100 : 100;

    // Get monthly growth rate
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const usersLastMonthResult = await db.get('SELECT COUNT(*) as count FROM users WHERE created_at >= ?', [monthAgo]);
    const usersBeforeMonthResult = await db.get('SELECT COUNT(*) as count FROM users WHERE created_at < ? AND created_at >= ?', 
      [monthAgo, new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()]);
    
    const usersLastMonth = usersLastMonthResult.count;
    const usersBeforeMonth = usersBeforeMonthResult.count;
    const monthlyGrowth = usersBeforeMonth > 0 ? ((usersLastMonth - usersBeforeMonth) / usersBeforeMonth) * 100 : 100;

    // Get engagement rate (percentage of active users)
    const engagementRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

    // Get top posts by views
    const topPosts = await db.all(`
      SELECT 
        bp.id, 
        bp.title, 
        bp.views_count as views, 
        0 as shares,
        COALESCE(l.like_count, 0) as likes,
        COALESCE(c.comment_count, 0) as comments
      FROM blog_posts bp
      LEFT JOIN (
        SELECT blog_post_id, COUNT(*) as like_count 
        FROM blog_post_likes 
        GROUP BY blog_post_id
      ) l ON bp.id = l.blog_post_id
      LEFT JOIN (
        SELECT blog_post_id, COUNT(*) as comment_count 
        FROM blog_post_comments 
        GROUP BY blog_post_id
      ) c ON bp.id = c.blog_post_id
      WHERE bp.status = 'published'
      ORDER BY bp.views_count DESC
      LIMIT 5
    `);

    // Get top events by views
    const topEvents = await db.all(`
      SELECT 
        e.id,
        e.title,
        e.start_date,
        e.status,
        e.views_count as views,
        e.likes_count as likes,
        COALESCE(c.comment_count, 0) as comments
      FROM events e
      LEFT JOIN (
        SELECT event_id, COUNT(*) as comment_count
        FROM events_comments
        GROUP BY event_id
      ) c ON e.id = c.event_id
      WHERE e.status IN ('published', 'completed')
      ORDER BY e.views_count DESC
      LIMIT 5
    `);

    // Get user activity trend (last 7 days)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6); // Last 7 days including today
    
    const userActivity = await db.all(
      `SELECT 
        DATE(u.created_at) as date,
        COUNT(u.id) as new_users
      FROM users u
      WHERE u.created_at >= ?
      GROUP BY DATE(u.created_at)
      ORDER BY DATE(u.created_at)`,
      [startDate.toISOString()]
    );

    // Get activity stats for the same dates
    const activityStats = await db.all(
      `SELECT 
        DATE(created_at) as date,
        COUNT(DISTINCT user_id) as active_users
      FROM (
        SELECT author_id as user_id, created_at FROM blog_posts
        UNION ALL
        SELECT author_id as user_id, created_at FROM confessions
        UNION ALL
        SELECT user_id, created_at FROM blog_post_comments
        UNION ALL
        SELECT user_id, created_at FROM confession_comments
        UNION ALL
        SELECT user_id, created_at FROM marketplace_comments
      )
      WHERE created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)`,
      [startDate.toISOString()]
    );

    // Merge the two datasets
    const mergedActivity = userActivity.map(day => {
      const activity = activityStats.find(stat => stat.date === day.date) || { active_users: 0 };
      return {
        date: day.date,
        newUsers: day.new_users,
        activeUsers: activity.active_users
      };
    });

    // Get post trends (last 7 days)
    const postTrends = await db.all(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as posts,
        SUM(views_count) as views,
        SUM(likes_count) as likes,
        SUM(comments_count) as comments
      FROM blog_posts
      WHERE created_at >= ? AND status = 'published'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
    `, [startDate.toISOString()]);

    // Get category distribution
    const categoryDistribution = await db.all(`
      SELECT 
        c.name,
        COUNT(bp.id) as posts
      FROM categories c
      LEFT JOIN blog_posts bp ON c.id = bp.category_id AND bp.status = 'published'
      GROUP BY c.id, c.name
      HAVING COUNT(bp.id) > 0
      ORDER BY COUNT(bp.id) DESC
    `);

    // Calculate percentages for category distribution
    const totalPublishedPosts = totalPosts;
    const categoryDistributionWithPercentages = categoryDistribution.map(cat => ({
      name: cat.name,
      posts: cat.posts,
      percentage: totalPublishedPosts > 0 ? Math.round((cat.posts / totalPublishedPosts) * 100) : 0
    }));

    // Format the response data
    const analyticsData = {
      totalUsers,
      totalPosts,
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      activeUsers,
      weeklyGrowth: parseFloat(weeklyGrowth.toFixed(2)),
      monthlyGrowth: parseFloat(monthlyGrowth.toFixed(2)),
      engagementRate: parseFloat(engagementRate.toFixed(2)),
      topPosts: topPosts.map(post => ({
        id: post.id.toString(),
        title: post.title,
        views: post.views,
        likes: post.likes || 0,
        comments: post.comments || 0,
        shares: post.shares || 0,
        type: 'blog'
      })),
      topEvents: topEvents.map(event => ({
        id: event.id.toString(),
        title: event.title,
        startDate: event.start_date,
        status: event.status,
        views: event.views || 0,
        likes: event.likes || 0,
        comments: event.comments || 0
      })),
      userActivity: mergedActivity.map(activity => ({
        date: activity.date,
        newUsers: activity.newUsers || 0,
        activeUsers: activity.activeUsers || 0,
        likes: 0,
        comments: 0,
        shares: 0
      })),
      postTrends: postTrends.map(trend => ({
        date: trend.date,
        posts: trend.posts,
        views: trend.views || 0,
        likes: trend.likes || 0,
        comments: trend.comments || 0
      })),
      categoryDistribution: categoryDistributionWithPercentages.map((category) => ({
        ...category,
        likes: 0,
        comments: 0
      })),
      contentTypeEngagement: [],
      trendingContent: []
    };

    res.json({
      success: true,
      data: analyticsData,
      message: 'Analytics data retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data',
      error: error.message
    });
  }
};

// Helper function to calculate date based on range
function getPeriodDate(range) {
  const now = new Date();
  switch (range) {
    case '7d':
      now.setDate(now.getDate() - 7);
      break;
    case '90d':
      now.setDate(now.getDate() - 90);
      break;
    case '30d':
    default:
      now.setDate(now.getDate() - 30);
      break;
  }
  return now.toISOString();
}
