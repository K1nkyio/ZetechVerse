import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, PlusCircle, Heart, Briefcase, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <AdminLayout variant="admin">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground break-words">
              Dashboard Overview
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage content, moderation, and your publishing workflow.
            </p>
          </div>
          <Button onClick={() => navigate('/admin/create')} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Post
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          <div className="admin-card p-4 sm:p-5">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">Content Management</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              Create and manage blog posts, pages, and publishing drafts.
            </p>
          </div>
          <div className="admin-card p-4 sm:p-5">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">User Moderation</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              Moderate confessions, comments, and community submissions.
            </p>
          </div>
          <div className="admin-card p-4 sm:p-5">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">Operational Visibility</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              Quickly monitor activity and jump into key admin tasks.
            </p>
          </div>
        </div>

        <Card className="admin-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-xl">Quick Actions</CardTitle>
            <CardDescription className="text-sm">Jump directly to the sections you manage most.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <Button
              onClick={() => navigate('/admin/create')}
              className="w-full justify-start text-left h-auto py-3 whitespace-normal break-words leading-normal"
            >
              <FileText className="w-4 h-4 mr-2 shrink-0" />
              Create Post
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin/posts')}
              className="w-full justify-start text-left h-auto py-3 whitespace-normal break-words leading-normal"
            >
              <FileText className="w-4 h-4 mr-2 shrink-0" />
              View Posts
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin/comments')}
              className="w-full justify-start text-left h-auto py-3 whitespace-normal break-words leading-normal"
            >
              <MessageSquare className="w-4 h-4 mr-2 shrink-0" />
              Comments
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin/confessions')}
              className="w-full justify-start text-left h-auto py-3 whitespace-normal break-words leading-normal"
            >
              <Heart className="w-4 h-4 mr-2 shrink-0" />
              Confessions
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin/opportunities')}
              className="w-full justify-start text-left h-auto py-3 whitespace-normal break-words leading-normal"
            >
              <Briefcase className="w-4 h-4 mr-2 shrink-0" />
              Opportunities
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin/profile')}
              className="w-full justify-start text-left h-auto py-3 whitespace-normal break-words leading-normal"
            >
              <User className="w-4 h-4 mr-2 shrink-0" />
              Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
