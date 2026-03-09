import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatsCard } from "@/components/admin/StatsCard";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/api/base";
import { postsApi } from "@/api/posts.api";
import { confessionsApi } from "@/api/confessions.api";
import { notificationsApi, type Notification } from "@/api/notifications.api";
import { FileText, Users, MessageSquare, Clock, Eye, Heart, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

type StatVariant = "primary" | "accent" | "success" | "warning";
type ActivityType = "post" | "comment" | "user" | "approval" | "rejection";

interface DashboardStat {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: any;
  variant?: StatVariant;
}

interface DashboardActivity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  time: string;
}

interface AdminAccount {
  role: "admin" | "super_admin";
  admin_status: "pending" | "approved" | "deactivated";
}

interface UserAccount {
  is_active: boolean;
}

const formatRelativeTime = (dateValue?: string) => {
  if (!dateValue) return "now";

  const eventDate = new Date(dateValue).getTime();
  if (Number.isNaN(eventDate)) return "now";

  const diffMs = Date.now() - eventDate;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(dateValue).toLocaleDateString();
};

const getActivityTypeFromNotification = (type: Notification["type"]): ActivityType => {
  if (type === "confession_comment" || type === "blog_comment") return "comment";
  if (type === "personal") return "user";
  if (type === "listing_sold" || type === "application_update" || type === "confession_like") return "approval";
  if (type === "alert" || type === "maintenance") return "rejection";
  return "post";
};

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [recentActivity, setRecentActivity] = useState<DashboardActivity[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoadingStats(true);
      setLoadingActivity(true);

      const [
        totalPostsResult,
        publishedPostsResult,
        reviewQueueResult,
        pendingConfessionsResult,
        adminAccountsResult,
        pendingAdminsResult,
        usersResult,
        notificationsResult,
      ] = await Promise.allSettled([
        postsApi.getPosts({ limit: 1 }),
        postsApi.getPosts({ status: "published", limit: 1 }),
        postsApi.getReviewQueue({ limit: 1 }),
        confessionsApi.getConfessions({ status: "pending", limit: 1 }),
        apiClient.get<AdminAccount[]>("/auth/admin/accounts"),
        apiClient.get<{ id: number }[]>("/auth/admin/pending"),
        apiClient.get<UserAccount[]>("/auth/users"),
        notificationsApi.getNotifications({ limit: 8 }),
      ]);

      const totalPosts =
        totalPostsResult.status === "fulfilled" ? totalPostsResult.value.pagination.total || 0 : 0;
      const publishedPosts =
        publishedPostsResult.status === "fulfilled" ? publishedPostsResult.value.pagination.total || 0 : 0;
      const pendingReviews =
        reviewQueueResult.status === "fulfilled" ? reviewQueueResult.value.pagination.total || 0 : 0;
      const pendingConfessions =
        pendingConfessionsResult.status === "fulfilled"
          ? pendingConfessionsResult.value.pagination.total || 0
          : 0;

      const adminAccounts =
        adminAccountsResult.status === "fulfilled" ? adminAccountsResult.value.data.data || [] : [];
      const pendingAdmins =
        pendingAdminsResult.status === "fulfilled" ? pendingAdminsResult.value.data.data || [] : [];
      const users = usersResult.status === "fulfilled" ? usersResult.value.data.data || [] : [];

      const activeAdmins = adminAccounts.filter(
        (account: AdminAccount) =>
          account.role === "super_admin" || account.admin_status === "approved"
      ).length;
      const activeUsers = users.filter((user: UserAccount) => user.is_active).length;

      setStats([
        {
          title: "Pending Reviews",
          value: pendingReviews,
          subtitle: `${pendingConfessions} confession approvals waiting`,
          icon: Clock,
          variant: "warning",
        },
        {
          title: "Published Posts",
          value: publishedPosts,
          subtitle: `${totalPosts} total posts in the system`,
          icon: FileText,
          variant: "primary",
        },
        {
          title: "Active Admins",
          value: activeAdmins,
          subtitle: `${pendingAdmins.length} pending admin requests`,
          icon: UserCheck,
          variant: "accent",
        },
        {
          title: "Active Users",
          value: activeUsers,
          subtitle: `${Math.max(users.length - activeUsers, 0)} inactive users`,
          icon: Users,
          variant: "success",
        },
      ]);
      setLoadingStats(false);

      const notifications =
        notificationsResult.status === "fulfilled" ? notificationsResult.value.notifications || [] : [];

      setRecentActivity(
        notifications.map((notification) => ({
          id: `notification-${notification.id}`,
          type: getActivityTypeFromNotification(notification.type),
          title: notification.title || "Notification update",
          description: notification.message,
          time: formatRelativeTime(notification.created_at),
        }))
      );
      setLoadingActivity(false);
    };

    void loadDashboardData();
  }, []);

  return (
    <AdminLayout variant="super-admin">
      <div className="space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground">Dashboard Overview</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Welcome back! Here&apos;s what&apos;s happening today.</p>
          </div>
          <div className="flex w-full md:w-auto gap-3">
            <Button variant="outline" onClick={() => navigate('/super-admin/review')} className="w-full md:w-auto">
              <Eye className="mr-2 h-4 w-4" />
              Review Queue
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {loadingStats ? (
            <div className="md:col-span-2 lg:col-span-4">
              <Card className="admin-card">
                <CardContent className="py-8 text-center text-muted-foreground">
                  Loading statistics...
                </CardContent>
              </Card>
            </div>
          ) : stats.length === 0 ? (
            <div className="md:col-span-2 lg:col-span-4 text-center py-8">
              <p className="text-muted-foreground">No statistics available.</p>
            </div>
          ) : (
            stats.map((stat) => (
              <StatsCard key={stat.title} {...stat} />
            ))
          )}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Feed */}
          <div className="lg:col-span-2">
            <Card className="admin-card h-full">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="font-display text-lg sm:text-xl">Recent Activity</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary self-start sm:self-auto"
                  onClick={() => navigate("/super-admin/notifications")}
                >
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                {loadingActivity ? (
                  <p className="text-muted-foreground text-center py-4">Loading recent activity...</p>
                ) : recentActivity.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No recent activity.</p>
                ) : (
                  <ActivityFeed activities={recentActivity} />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div>
            <Card className="admin-card h-full">
              <CardHeader>
                <CardTitle className="font-display text-lg sm:text-xl">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full justify-start whitespace-normal break-words leading-normal text-left h-auto py-3 gradient-primary text-primary-foreground"
                  onClick={() => navigate('/super-admin/review')}
                >
                  <Clock className="mr-2 h-4 w-4 shrink-0" />
                  Review Pending Posts
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start whitespace-normal break-words leading-normal text-left h-auto py-3"
                  onClick={() => navigate('/super-admin/posts')}
                >
                  <FileText className="mr-2 h-4 w-4 shrink-0" />
                  Manage All Posts
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start whitespace-normal break-words leading-normal text-left h-auto py-3"
                  onClick={() => navigate('/super-admin/users')}
                >
                  <Users className="mr-2 h-4 w-4 shrink-0" />
                  Manage Users
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start whitespace-normal break-words leading-normal text-left h-auto py-3"
                  onClick={() => navigate('/super-admin/confessions')}
                >
                  <Heart className="mr-2 h-4 w-4 shrink-0" />
                  Moderate Confessions
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start whitespace-normal break-words leading-normal text-left h-auto py-3"
                  onClick={() => navigate('/super-admin/comments')}
                >
                  <MessageSquare className="mr-2 h-4 w-4 shrink-0" />
                  Moderate Comments
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
