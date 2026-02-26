import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatsCard } from "@/components/admin/StatsCard";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, MessageSquare, Clock, Eye, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";

const stats = [];

const recentActivity = [];

export default function SuperAdminDashboard() {
  const navigate = useNavigate();

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
          {stats.length === 0 ? (
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
                <Button variant="ghost" size="sm" className="text-primary self-start sm:self-auto">
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
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
