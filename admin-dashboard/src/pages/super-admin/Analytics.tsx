import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Users, Eye, MessageCircle, TrendingUp, Calendar, Activity, BarChart, PieChart, Clock, Heart, Share2, ThumbsUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { postsApi } from '@/api/posts.api';
import { apiClient, handleApiResponse } from '@/api/base';

interface AnalyticsData {
  totalUsers: number;
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  activeUsers: number;
  weeklyGrowth: number;
  monthlyGrowth: number;
  engagementRate: number;
  topPosts: Array<{
    id: string;
    title: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    type: 'blog' | 'confession' | 'marketplace' | 'event';
  }>;
  topEvents: Array<{
    id: string;
    title: string;
    startDate: string;
    status: string;
    views: number;
    likes: number;
    comments: number;
  }>;
  userActivity: Array<{
    date: string;
    newUsers: number;
    activeUsers: number;
    likes: number;
    comments: number;
    shares: number;
  }>;
  postTrends: Array<{
    date: string;
    posts: number;
    views: number;
    likes: number;
    comments: number;
  }>;
  categoryDistribution: Array<{
    name: string;
    posts: number;
    likes: number;
    comments: number;
    percentage: number;
  }>;
  contentTypeEngagement: Array<{
    type: string;
    posts: number;
    likes: number;
    comments: number;
    shares: number;
    engagementRate: number;
  }>;
  trendingContent: Array<{
    id: string;
    title: string;
    type: string;
    likes: number;
    comments: number;
    shares: number;
    engagementRate: number;
  }>;
}

interface AnalyticsResponse {
  success: boolean;
  data: AnalyticsData;
  message?: string;
}

// Define the API client for analytics
const analyticsApi = {
  getAnalytics: async (params: { range?: string } = {}) => {
    try {
      const response = await apiClient.get<{ success: boolean; data: AnalyticsData; message?: string }>(
        '/analytics',
        params
      );
      console.log('Analytics API response object:', response);
      
      if (response.status === 200 && response.data.success && response.data.data) {
        return response.data.data;
      } else {
        console.error('Analytics API returned failure:', response.data);
        throw new Error(response.data.message || 'Analytics API request failed');
      }
    } catch (error) {
      console.error('Analytics API call failed:', error);
      throw error;
    }
  }
};

export default function SuperAdminAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await analyticsApi.getAnalytics({ range: timeRange });
      
      setAnalyticsData(result);
    } catch (error: any) {
      console.error('Failed to fetch analytics data:', error);
      setError('Failed to load analytics data. Please try again later.');
      
      // As fallback, we could provide empty data structure
      const emptyData: AnalyticsData = {
        totalUsers: 0,
        totalPosts: 0,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        activeUsers: 0,
        weeklyGrowth: 0,
        monthlyGrowth: 0,
        engagementRate: 0,
        topPosts: [],
        topEvents: [],
        userActivity: [],
        postTrends: [],
        categoryDistribution: [],
        contentTypeEngagement: [],
        trendingContent: []
      };
      setAnalyticsData(emptyData);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analyticsData) {
    return (
      <AdminLayout variant="super-admin">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Analytics</h1>
            <p className="text-muted-foreground">Platform performance and engagement metrics</p>
          </div>
          
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg">
              <p>{error}</p>
              <Button variant="outline" className="mt-2" onClick={fetchAnalyticsData}>
                Retry
              </Button>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((item) => (
              <Card key={item} className="admin-card">
                <CardContent className="p-6">
                  <div className="animate-pulse flex flex-col space-y-4">
                    <div className="h-4 bg-muted rounded w-1/3"></div>
                    <div className="h-8 bg-muted rounded w-2/3"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout variant="super-admin">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Analytics</h1>
            <p className="text-muted-foreground">Platform performance and engagement metrics</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as any)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchAnalyticsData}>
              Refresh
            </Button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="admin-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{(analyticsData?.totalUsers || 0).toLocaleString()}</p>
                  <div className="flex items-center mt-1 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-500">+{(analyticsData?.weeklyGrowth || 0)}% this week</span>
                  </div>
                </div>
                <Users className="h-10 w-10 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="admin-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Posts</p>
                  <p className="text-2xl font-bold">{(analyticsData?.totalPosts || 0).toLocaleString()}</p>
                  <div className="flex items-center mt-1 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-500">+{(analyticsData?.monthlyGrowth || 0)}% this month</span>
                  </div>
                </div>
                <BarChart3 className="h-10 w-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="admin-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Likes</p>
                  <p className="text-2xl font-bold">{(analyticsData?.totalLikes || 0).toLocaleString()}</p>
                  <div className="flex items-center mt-1 text-sm">
                    <Heart className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-red-500">Engagement Rate: {(analyticsData?.engagementRate || 0)}%</span>
                  </div>
                </div>
                <Heart className="h-10 w-10 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="admin-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Comments</p>
                  <p className="text-2xl font-bold">{(analyticsData?.totalComments || 0).toLocaleString()}</p>
                  <div className="flex items-center mt-1 text-sm">
                    <MessageCircle className="h-4 w-4 text-blue-500 mr-1" />
                    <span className="text-blue-500">Active Discussions</span>
                  </div>
                </div>
                <MessageCircle className="h-10 w-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="admin-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Shares</p>
                  <p className="text-2xl font-bold">{(analyticsData?.totalShares || 0).toLocaleString()}</p>
                  <div className="flex items-center mt-1 text-sm">
                    <Share2 className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-500">Content Sharing</span>
                  </div>
                </div>
                <Share2 className="h-10 w-10 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Activity Chart */}
          <Card className="admin-card">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                User Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={analyticsData?.userActivity || []}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="activeUsers" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="newUsers" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Post Trends Chart */}
          <Card className="admin-card">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Post Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={analyticsData?.postTrends || []}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="posts" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="views" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Category Distribution */}
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Category Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart
                  data={analyticsData?.categoryDistribution || []}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="posts" fill="#8b5cf6" />
                </RechartsBarChart>
              </ResponsiveContainer>
              <div className="space-y-4">
                {(analyticsData?.categoryDistribution || []).map((category, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }}></div>
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{category.posts} posts</p>
                      <p className="text-sm text-muted-foreground">{category.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Type Engagement */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="admin-card">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <BarChart className="h-5 w-5 text-primary" />
                Content Type Engagement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart
                  data={analyticsData?.contentTypeEngagement || []}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="likes" fill="#ef4444" name="Likes" />
                  <Bar dataKey="comments" fill="#3b82f6" name="Comments" />
                  <Bar dataKey="shares" fill="#10b981" name="Shares" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="admin-card">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Trending Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(analyticsData?.trendingContent || []).map((content, index) => (
                  <div key={content.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {content.type}
                        </Badge>
                        <span className="text-sm font-medium truncate">{content.title}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {content.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {content.comments}
                        </span>
                        <span className="flex items-center gap-1">
                          <Share2 className="h-3 w-3" />
                          {content.shares}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-500">
                        {content.engagementRate}%
                      </p>
                      <p className="text-xs text-muted-foreground">Engagement</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Engagement Trends */}
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Engagement Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={analyticsData?.postTrends || []}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="likes" stroke="#ef4444" strokeWidth={2} name="Likes" />
                <Line type="monotone" dataKey="comments" stroke="#3b82f6" strokeWidth={2} name="Comments" />
                <Line type="monotone" dataKey="views" stroke="#8b5cf6" strokeWidth={2} name="Views" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Posts */}
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Top Performing Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Title</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Views</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Likes</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Comments</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Shares</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {(analyticsData?.topPosts || []).map((post) => (
                    <tr key={post.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{post.title}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs">
                          {post.type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">{post.views.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">{post.likes}</td>
                      <td className="py-3 px-4 text-right">{post.comments}</td>
                      <td className="py-3 px-4 text-right">{post.shares}</td>
                      <td className="py-3 px-4 text-right">
                        <Badge variant="secondary">
                          {((post.likes + post.comments + post.shares) / post.views * 100).toFixed(2)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Top Events */}
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Top Performing Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Title</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Start Date</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Views</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Likes</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Comments</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {(analyticsData?.topEvents || []).map((event) => {
                    const engagement = event.views > 0
                      ? ((event.likes + event.comments) / event.views) * 100
                      : 0;
                    return (
                      <tr key={event.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{event.title}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-xs capitalize">
                            {event.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {event.startDate ? new Date(event.startDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">{event.views.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">{event.likes}</td>
                        <td className="py-3 px-4 text-right">{event.comments}</td>
                        <td className="py-3 px-4 text-right">
                          <Badge variant="secondary">
                            {engagement.toFixed(2)}%
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
