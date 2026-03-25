const db = require('../config/db');

const getRangeDays = (range = '30d') => {
  switch (range) {
    case '7d':
      return 7;
    case '90d':
      return 90;
    case '30d':
    default:
      return 30;
  }
};

const getPeriodDate = (range) => {
  const now = new Date();
  now.setDate(now.getDate() - getRangeDays(range));
  return now.toISOString();
};

const toDateKey = (dateValue) => {
  const value = new Date(dateValue);
  if (Number.isNaN(value.getTime())) return '';
  return value.toISOString().slice(0, 10);
};

const buildDateKeys = (range) => {
  const totalDays = getRangeDays(range);
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() - (totalDays - 1));

  return Array.from({ length: totalDays }, (_, index) => {
    const current = new Date(cursor);
    current.setDate(cursor.getDate() + index);
    return toDateKey(current);
  });
};

const fillSeries = (dateKeys, rows, mapper) => {
  const rowMap = new Map(rows.map((row) => [row.date, row]));
  return dateKeys.map((date) => mapper(date, rowMap.get(date) || {}));
};

const safeNumber = (value) => Number(value || 0);

const computePercentChange = (currentValue, baselineValue) => {
  if (!baselineValue && currentValue > 0) return 100;
  if (!baselineValue) return 0;
  return ((currentValue - baselineValue) / baselineValue) * 100;
};

const buildUserDrilldownItem = (user) => ({
  id: String(user.id),
  title: user.full_name || user.username || user.email || 'User',
  subtitle: [user.email, user.course, user.year_of_study ? `Year ${user.year_of_study}` : null]
    .filter(Boolean)
    .join(' • '),
  metricLabel: user.last_login_at ? 'Last active' : 'Created',
  metricValue: user.last_login_at || user.created_at,
  route: '/super-admin/users'
});

const buildPostDrilldownItem = (post) => ({
  id: String(post.id),
  title: post.title,
  subtitle: [post.category_name, post.author_name].filter(Boolean).join(' • '),
  metricLabel: post.metric_label || 'Interactions',
  metricValue: safeNumber(post.metric_value),
  route: `/super-admin/posts/${post.id}`
});

const buildEventDrilldownItem = (event) => ({
  id: String(event.id),
  title: event.title,
  subtitle: [event.status, event.start_date ? new Date(event.start_date).toLocaleDateString() : null]
    .filter(Boolean)
    .join(' • '),
  metricLabel: event.metric_label || 'Interactions',
  metricValue: safeNumber(event.metric_value),
  route: `/admin/events/${event.id}`
});

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
    const startDate = getPeriodDate(range);
    const dateKeys = buildDateKeys(range);

    const [
      totalUsersResult,
      totalPostsResult,
      totalViewsResult,
      totalCommentsResult,
      totalLikesResult,
      totalSharesResult,
      activeUsersResult,
      usersLastWeekResult,
      usersBeforeWeekResult,
      usersLastMonthResult,
      usersBeforeMonthResult,
      topPosts,
      topEvents,
      newUsersRows,
      activeUsersRows,
      publishingRows,
      likesTimelineRows,
      commentsTimelineRows,
      categoryDistribution,
      inactiveAdminsRows,
      pendingAdminsResult,
    ] = await Promise.all([
      db.get('SELECT COUNT(*) as count FROM users'),
      db.get('SELECT COUNT(*) as count FROM blog_posts WHERE status = ?', ['published']),
      db.get('SELECT SUM(views_count) as total_views FROM blog_posts'),
      db.get('SELECT (SELECT COUNT(*) FROM blog_post_comments) + (SELECT COUNT(*) FROM confession_comments) + (SELECT COUNT(*) FROM marketplace_comments) + (SELECT COUNT(*) FROM events_comments) as count'),
      db.get(`
        SELECT
          COALESCE((SELECT SUM(likes_count) FROM blog_posts), 0) +
          COALESCE((SELECT SUM(likes_count) FROM events), 0) +
          COALESCE((SELECT SUM(likes_count) FROM confessions), 0) +
          COALESCE((SELECT SUM(likes_count) FROM marketplace_listings), 0) as count
      `),
      db.get(`
        SELECT
          COALESCE((SELECT SUM(shares_count) FROM confessions), 0) +
          COALESCE((SELECT SUM(applications_count) FROM opportunities), 0) as count
      `),
      db.get(
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
           UNION
           SELECT DISTINCT user_id FROM events_comments WHERE created_at >= ?
         )`,
        [startDate, startDate, startDate, startDate, startDate, startDate]
      ),
      db.get('SELECT COUNT(*) as count FROM users WHERE created_at >= ?', [new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()]),
      db.get('SELECT COUNT(*) as count FROM users WHERE created_at < ? AND created_at >= ?', [
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
      ]),
      db.get('SELECT COUNT(*) as count FROM users WHERE created_at >= ?', [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()]),
      db.get('SELECT COUNT(*) as count FROM users WHERE created_at < ? AND created_at >= ?', [
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
      ]),
      db.all(`
        SELECT 
          bp.id, 
          bp.title,
          bp.views_count as views,
          COALESCE(bp.likes_count, 0) as likes,
          COALESCE(bp.comments_count, 0) as comments,
          0 as shares,
          c.name as category_name,
          u.full_name as author_name
        FROM blog_posts bp
        LEFT JOIN categories c ON c.id = bp.category_id
        LEFT JOIN users u ON u.id = bp.author_id
        WHERE bp.status = 'published'
        ORDER BY bp.views_count DESC
        LIMIT 5
      `),
      db.all(`
        SELECT 
          e.id,
          e.title,
          e.start_date,
          e.status,
          COALESCE(e.views_count, 0) as views,
          COALESCE(e.likes_count, 0) as likes,
          COALESCE(ec.comment_count, 0) as comments
        FROM events e
        LEFT JOIN (
          SELECT event_id, COUNT(*) as comment_count
          FROM events_comments
          GROUP BY event_id
        ) ec ON ec.event_id = e.id
        WHERE e.status IN ('published', 'completed')
        ORDER BY e.views_count DESC
        LIMIT 5
      `),
      db.all(`
        SELECT DATE(created_at) as date, COUNT(*) as new_users
        FROM users
        WHERE created_at >= ?
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      `, [startDate]),
      db.all(`
        SELECT DATE(created_at) as date, COUNT(DISTINCT user_id) as active_users
        FROM (
          SELECT author_id as user_id, created_at FROM blog_posts WHERE author_id IS NOT NULL
          UNION ALL
          SELECT author_id as user_id, created_at FROM confessions WHERE author_id IS NOT NULL
          UNION ALL
          SELECT user_id, created_at FROM blog_post_comments
          UNION ALL
          SELECT user_id, created_at FROM confession_comments
          UNION ALL
          SELECT user_id, created_at FROM marketplace_comments
          UNION ALL
          SELECT user_id, created_at FROM events_comments
        )
        WHERE created_at >= ?
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      `, [startDate]),
      db.all(`
        SELECT
          DATE(COALESCE(published_at, created_at)) as date,
          COUNT(*) as posts
        FROM blog_posts
        WHERE status = 'published'
          AND COALESCE(published_at, created_at) >= ?
        GROUP BY DATE(COALESCE(published_at, created_at))
        ORDER BY DATE(COALESCE(published_at, created_at))
      `, [startDate]),
      db.all(`
        SELECT date, SUM(likes) as likes
        FROM (
          SELECT DATE(liked_at) as date, COUNT(*) as likes
          FROM blog_post_likes
          WHERE liked_at >= ?
          GROUP BY DATE(liked_at)
          UNION ALL
          SELECT DATE(liked_at) as date, COUNT(*) as likes
          FROM event_likes
          WHERE liked_at >= ?
          GROUP BY DATE(liked_at)
        )
        GROUP BY date
        ORDER BY date
      `, [startDate, startDate]),
      db.all(`
        SELECT date, SUM(comments) as comments
        FROM (
          SELECT DATE(created_at) as date, COUNT(*) as comments
          FROM blog_post_comments
          WHERE created_at >= ? AND status = 'approved'
          GROUP BY DATE(created_at)
          UNION ALL
          SELECT DATE(created_at) as date, COUNT(*) as comments
          FROM events_comments
          WHERE created_at >= ? AND status = 'approved'
          GROUP BY DATE(created_at)
        )
        GROUP BY date
        ORDER BY date
      `, [startDate, startDate]),
      db.all(`
        SELECT 
          c.name,
          COUNT(bp.id) as posts
        FROM categories c
        LEFT JOIN blog_posts bp ON c.id = bp.category_id AND bp.status = 'published'
        GROUP BY c.id, c.name
        HAVING COUNT(bp.id) > 0
        ORDER BY COUNT(bp.id) DESC
      `),
      db.all(`
        SELECT
          id,
          full_name,
          username,
          email,
          role,
          admin_status,
          last_login_at,
          created_at
        FROM users
        WHERE role IN ('admin', 'super_admin')
          AND (
            (last_login_at IS NOT NULL AND last_login_at < ?)
            OR (last_login_at IS NULL AND created_at < ?)
          )
        ORDER BY COALESCE(last_login_at, created_at) ASC
      `, [
        new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
      ]),
      db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND admin_status = 'pending'`)
    ]);

    const totalUsers = safeNumber(totalUsersResult?.count);
    const totalPosts = safeNumber(totalPostsResult?.count);
    const totalViews = safeNumber(totalViewsResult?.total_views);
    const totalComments = safeNumber(totalCommentsResult?.count);
    const totalLikes = safeNumber(totalLikesResult?.count);
    const totalShares = safeNumber(totalSharesResult?.count);
    const activeUsers = safeNumber(activeUsersResult?.count);

    const usersLastWeek = safeNumber(usersLastWeekResult?.count);
    const usersBeforeWeek = safeNumber(usersBeforeWeekResult?.count);
    const weeklyGrowth = usersBeforeWeek > 0 ? ((usersLastWeek - usersBeforeWeek) / usersBeforeWeek) * 100 : usersLastWeek > 0 ? 100 : 0;

    const usersLastMonth = safeNumber(usersLastMonthResult?.count);
    const usersBeforeMonth = safeNumber(usersBeforeMonthResult?.count);
    const monthlyGrowth = usersBeforeMonth > 0 ? ((usersLastMonth - usersBeforeMonth) / usersBeforeMonth) * 100 : usersLastMonth > 0 ? 100 : 0;
    const engagementRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

    const userActivity = fillSeries(dateKeys, newUsersRows, (date, newUserRow) => {
      const activeUserRow = activeUsersRows.find((row) => row.date === date) || {};
      return {
        date,
        newUsers: safeNumber(newUserRow.new_users),
        activeUsers: safeNumber(activeUserRow.active_users)
      };
    });

    const publishingTimeline = fillSeries(dateKeys, publishingRows, (date, row) => ({
      date,
      posts: safeNumber(row.posts)
    }));

    const engagementTimeline = fillSeries(dateKeys, likesTimelineRows, (date, likeRow) => {
      const commentRow = commentsTimelineRows.find((row) => row.date === date) || {};
      return {
        date,
        likes: safeNumber(likeRow.likes),
        comments: safeNumber(commentRow.comments)
      };
    });

    const postTrends = dateKeys.map((date) => {
      const publishing = publishingTimeline.find((row) => row.date === date) || {};
      const engagement = engagementTimeline.find((row) => row.date === date) || {};
      return {
        date,
        posts: safeNumber(publishing.posts),
        views: 0,
        likes: safeNumber(engagement.likes),
        comments: safeNumber(engagement.comments)
      };
    });

    const totalPublishedPosts = totalPosts;
    const categoryDistributionWithPercentages = categoryDistribution.map((category) => ({
      name: category.name,
      posts: safeNumber(category.posts),
      likes: 0,
      comments: 0,
      percentage: totalPublishedPosts > 0 ? Math.round((safeNumber(category.posts) / totalPublishedPosts) * 100) : 0
    }));

    const trendingContent = [...topPosts, ...topEvents]
      .map((item) => {
        const views = safeNumber(item.views);
        const likes = safeNumber(item.likes);
        const comments = safeNumber(item.comments);
        const shares = safeNumber(item.shares);
        const engagement = views > 0 ? ((likes + comments + shares) / views) * 100 : 0;

        return {
          id: String(item.id),
          title: item.title,
          type: item.start_date ? 'event' : 'blog',
          likes,
          comments,
          shares,
          engagementRate: Number(engagement.toFixed(2))
        };
      })
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, 5);

    const contentTypeEngagement = [
      {
        type: 'Blog Posts',
        posts: totalPosts,
        likes: safeNumber(topPosts.reduce((sum, item) => sum + safeNumber(item.likes), 0)),
        comments: safeNumber(topPosts.reduce((sum, item) => sum + safeNumber(item.comments), 0)),
        shares: 0,
        engagementRate: totalPosts > 0 ? Number(((totalComments + totalLikes) / totalPosts).toFixed(2)) : 0
      },
      {
        type: 'Events',
        posts: safeNumber(topEvents.length),
        likes: safeNumber(topEvents.reduce((sum, item) => sum + safeNumber(item.likes), 0)),
        comments: safeNumber(topEvents.reduce((sum, item) => sum + safeNumber(item.comments), 0)),
        shares: 0,
        engagementRate: topEvents.length > 0
          ? Number(((topEvents.reduce((sum, item) => sum + safeNumber(item.likes) + safeNumber(item.comments), 0)) / topEvents.length).toFixed(2))
          : 0
      }
    ];

    const anomalies = [];
    const latestEngagement = engagementTimeline[engagementTimeline.length - 1] || { comments: 0, likes: 0, date: dateKeys[dateKeys.length - 1] };
    const previousCommentBaselineRows = engagementTimeline.slice(0, -1);
    const previousCommentBaseline = previousCommentBaselineRows.length > 0
      ? previousCommentBaselineRows.reduce((sum, item) => sum + safeNumber(item.comments), 0) / previousCommentBaselineRows.length
      : 0;
    const commentChange = computePercentChange(safeNumber(latestEngagement.comments), previousCommentBaseline);

    if (safeNumber(latestEngagement.comments) >= 5 && commentChange >= 80) {
      anomalies.push({
        id: 'comment-spike',
        severity: 'high',
        title: `Comments up ${Math.round(commentChange)}% today`,
        description: `Posts and events received ${safeNumber(latestEngagement.comments)} comments on ${latestEngagement.date}, well above the recent average.`,
        source: 'engagement',
        metric: 'comments',
        date: latestEngagement.date,
        actionLabel: 'Inspect content'
      });
    }

    if (inactiveAdminsRows.length > 0) {
      anomalies.push({
        id: 'inactive-admins',
        severity: inactiveAdminsRows.length >= 3 ? 'medium' : 'low',
        title: `${inactiveAdminsRows.length} admins inactive for 14+ days`,
        description: 'Review dormant admin and super-admin accounts before approvals or escalations back up.',
        source: 'adminInactivity',
        metric: 'inactiveAdmins',
        actionLabel: 'Review accounts'
      });
    }

    const analyticsData = {
      totalUsers,
      totalPosts,
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      activeUsers,
      weeklyGrowth: Number(weeklyGrowth.toFixed(2)),
      monthlyGrowth: Number(monthlyGrowth.toFixed(2)),
      engagementRate: Number(engagementRate.toFixed(2)),
      topPosts: topPosts.map((post) => ({
        id: String(post.id),
        title: post.title,
        views: safeNumber(post.views),
        likes: safeNumber(post.likes),
        comments: safeNumber(post.comments),
        shares: safeNumber(post.shares),
        type: 'blog'
      })),
      topEvents: topEvents.map((event) => ({
        id: String(event.id),
        title: event.title,
        startDate: event.start_date,
        status: event.status,
        views: safeNumber(event.views),
        likes: safeNumber(event.likes),
        comments: safeNumber(event.comments)
      })),
      userActivity,
      postTrends,
      publishingTimeline,
      engagementTimeline,
      categoryDistribution: categoryDistributionWithPercentages,
      contentTypeEngagement,
      trendingContent,
      anomalies,
      adminHealth: {
        inactiveAdmins14d: inactiveAdminsRows.length,
        pendingAdminRequests: safeNumber(pendingAdminsResult?.count)
      }
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

exports.getAnalyticsDrilldown = async (req, res) => {
  try {
    const { source, metric, date } = req.query;

    if (!source) {
      return res.status(400).json({
        success: false,
        message: 'source is required'
      });
    }

    const normalizedDate = date ? String(date).slice(0, 10) : null;
    const groups = [];
    let title = 'Drilldown';
    let subtitle = 'Operational details';

    if (source === 'userActivity') {
      if (!normalizedDate) {
        return res.status(400).json({
          success: false,
          message: 'date is required for user activity drilldown'
        });
      }

      title = metric === 'newUsers' ? 'New User Signups' : 'Active Users';
      subtitle = `Showing accounts matched on ${normalizedDate}`;

      if (metric === 'newUsers') {
        const users = await db.all(`
          SELECT id, full_name, username, email, course, year_of_study, created_at, last_login_at
          FROM users
          WHERE DATE(created_at) = ?
          ORDER BY created_at DESC
          LIMIT 30
        `, [normalizedDate]);

        groups.push({
          key: 'users',
          label: 'Users',
          items: users.map(buildUserDrilldownItem)
        });
      } else {
        const users = await db.all(`
          SELECT DISTINCT u.id, u.full_name, u.username, u.email, u.course, u.year_of_study, u.created_at, u.last_login_at
          FROM users u
          INNER JOIN (
            SELECT author_id as user_id FROM blog_posts WHERE DATE(created_at) = ? AND author_id IS NOT NULL
            UNION
            SELECT author_id as user_id FROM confessions WHERE DATE(created_at) = ? AND author_id IS NOT NULL
            UNION
            SELECT user_id FROM blog_post_comments WHERE DATE(created_at) = ?
            UNION
            SELECT user_id FROM confession_comments WHERE DATE(created_at) = ?
            UNION
            SELECT user_id FROM marketplace_comments WHERE DATE(created_at) = ?
            UNION
            SELECT user_id FROM events_comments WHERE DATE(created_at) = ?
          ) activity ON activity.user_id = u.id
          ORDER BY COALESCE(u.last_login_at, u.created_at) DESC
          LIMIT 30
        `, [normalizedDate, normalizedDate, normalizedDate, normalizedDate, normalizedDate, normalizedDate]);

        groups.push({
          key: 'users',
          label: 'Users',
          items: users.map(buildUserDrilldownItem)
        });
      }
    }

    if (source === 'publishing') {
      if (!normalizedDate) {
        return res.status(400).json({
          success: false,
          message: 'date is required for publishing drilldown'
        });
      }

      title = 'Published Posts';
      subtitle = `Posts published on ${normalizedDate}`;

      const posts = await db.all(`
        SELECT
          bp.id,
          bp.title,
          c.name as category_name,
          u.full_name as author_name,
          bp.created_at,
          bp.published_at,
          'Published' as metric_label,
          1 as metric_value
        FROM blog_posts bp
        LEFT JOIN categories c ON c.id = bp.category_id
        LEFT JOIN users u ON u.id = bp.author_id
        WHERE bp.status = 'published'
          AND DATE(COALESCE(bp.published_at, bp.created_at)) = ?
        ORDER BY COALESCE(bp.published_at, bp.created_at) DESC
        LIMIT 30
      `, [normalizedDate]);

      groups.push({
        key: 'posts',
        label: 'Posts',
        items: posts.map(buildPostDrilldownItem)
      });
    }

    if (source === 'engagement') {
      if (!normalizedDate) {
        return res.status(400).json({
          success: false,
          message: 'date is required for engagement drilldown'
        });
      }

      const posts = await db.all(
        metric === 'likes'
          ? `
            SELECT
              bp.id,
              bp.title,
              c.name as category_name,
              u.full_name as author_name,
              'Likes' as metric_label,
              COUNT(l.id) as metric_value
            FROM blog_post_likes l
            INNER JOIN blog_posts bp ON bp.id = l.blog_post_id
            LEFT JOIN categories c ON c.id = bp.category_id
            LEFT JOIN users u ON u.id = bp.author_id
            WHERE DATE(l.liked_at) = ?
            GROUP BY bp.id, bp.title, c.name, u.full_name
            ORDER BY metric_value DESC, bp.views_count DESC
            LIMIT 20
          `
          : `
            SELECT
              bp.id,
              bp.title,
              c.name as category_name,
              u.full_name as author_name,
              'Comments' as metric_label,
              COUNT(cmt.id) as metric_value
            FROM blog_post_comments cmt
            INNER JOIN blog_posts bp ON bp.id = cmt.blog_post_id
            LEFT JOIN categories c ON c.id = bp.category_id
            LEFT JOIN users u ON u.id = bp.author_id
            WHERE DATE(cmt.created_at) = ?
              AND cmt.status = 'approved'
            GROUP BY bp.id, bp.title, c.name, u.full_name
            ORDER BY metric_value DESC, bp.views_count DESC
            LIMIT 20
          `,
        [normalizedDate]
      );

      const events = await db.all(
        metric === 'likes'
          ? `
            SELECT
              e.id,
              e.title,
              e.status,
              e.start_date,
              'Likes' as metric_label,
              COUNT(l.id) as metric_value
            FROM event_likes l
            INNER JOIN events e ON e.id = l.event_id
            WHERE DATE(l.liked_at) = ?
            GROUP BY e.id, e.title, e.status, e.start_date
            ORDER BY metric_value DESC, e.views_count DESC
            LIMIT 20
          `
          : `
            SELECT
              e.id,
              e.title,
              e.status,
              e.start_date,
              'Comments' as metric_label,
              COUNT(c.id) as metric_value
            FROM events_comments c
            INNER JOIN events e ON e.id = c.event_id
            WHERE DATE(c.created_at) = ?
              AND c.status = 'approved'
            GROUP BY e.id, e.title, e.status, e.start_date
            ORDER BY metric_value DESC, e.views_count DESC
            LIMIT 20
          `,
        [normalizedDate]
      );

      title = metric === 'likes' ? 'Likes Drilldown' : 'Comments Drilldown';
      subtitle = `Content interactions captured on ${normalizedDate}`;

      groups.push({
        key: 'posts',
        label: 'Posts',
        items: posts.map(buildPostDrilldownItem)
      });
      groups.push({
        key: 'events',
        label: 'Events',
        items: events.map(buildEventDrilldownItem)
      });
    }

    if (source === 'adminInactivity') {
      const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const admins = await db.all(`
        SELECT id, full_name, username, email, role, last_login_at, created_at
        FROM users
        WHERE role IN ('admin', 'super_admin')
          AND (
            (last_login_at IS NOT NULL AND last_login_at < ?)
            OR (last_login_at IS NULL AND created_at < ?)
          )
        ORDER BY COALESCE(last_login_at, created_at) ASC
      `, [cutoff, cutoff]);

      title = 'Inactive Admin Accounts';
      subtitle = 'Accounts that have been idle for 14 days or longer';
      groups.push({
        key: 'admins',
        label: 'Admins',
        items: admins.map((admin) => ({
          id: String(admin.id),
          title: admin.full_name || admin.username || admin.email,
          subtitle: [admin.email, admin.role === 'super_admin' ? 'Super Admin' : 'Admin'].filter(Boolean).join(' • '),
          metricLabel: 'Last login',
          metricValue: admin.last_login_at || admin.created_at,
          route: '/super-admin/users'
        }))
      });
    }

    res.json({
      success: true,
      data: {
        title,
        subtitle,
        groups
      }
    });
  } catch (error) {
    console.error('Error fetching analytics drilldown:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch drilldown data',
      error: error.message
    });
  }
};
