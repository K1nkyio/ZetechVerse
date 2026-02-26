import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, Column } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Eye, Edit, Trash2, MoreHorizontal, PlusCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { postsApi, Post as ApiPost } from "@/api/posts.api";

interface Post {
  id: string;
  title: string;
  category: string;
  status: 'draft' | 'pending' | 'published' | 'rejected';
  date: string;
  views: number;
  [key: string]: unknown;
}

export default function AdminPosts() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [statusFilter]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await postsApi.getMyPosts({
        status: statusFilter as any,
        limit: 100 // Get all posts for admin view
      });

      const formattedPosts: Post[] = response.posts.map((post: ApiPost) => ({
        id: post.id.toString(),
        title: post.title,
        category: post.category_name || 'Uncategorized',
        status: post.status,
        date: new Date(post.created_at).toLocaleDateString(),
        views: post.views_count,
        ...post
      }));

      setPosts(formattedPosts);
    } catch (err: any) {
      console.error('Failed to fetch posts:', err);
      setError('Failed to load posts');
      toast({
        title: 'Error',
        description: 'Failed to load posts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts;

  const handleView = (post: Post) => {
    // Navigate to post view page within admin dashboard
    navigate(`/admin/posts/${post.id}`);
  };

  const handleEdit = (post: Post) => {
    navigate(`/admin/edit/${post.id}`);
  };

  const handleDeleteClick = (post: Post) => {
    setSelectedPost(post);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPost) return;

    try {
      setDeleting(true);
      await postsApi.deletePost(selectedPost.id);
      
      toast({
        title: 'Post Deleted',
        description: `"${selectedPost.title}" has been deleted successfully`,
      });

      // Refresh posts list
      fetchPosts();
      setDeleteDialogOpen(false);
      setSelectedPost(null);
    } catch (err: any) {
      console.error('Failed to delete post:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete post',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Post>[] = [
    {
      key: "title",
      header: "Title",
      render: (post) => (
        <div className="max-w-xs">
          <p className="font-medium text-foreground truncate">{post.title}</p>
          <p className="text-xs text-muted-foreground">{post.views.toLocaleString()} views</p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (post) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
          {post.category}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (post) => <StatusBadge status={post.status} />,
    },
    {
      key: "date",
      header: "Date",
      render: (post) => <span className="text-muted-foreground">{post.date}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (post) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem onClick={() => handleView(post)}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(post)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDeleteClick(post)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <AdminLayout variant="admin">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">My Posts</h1>
            <p className="text-muted-foreground">Manage your content</p>
          </div>
          <Button onClick={() => navigate('/admin/create')} className="gradient-primary text-primary-foreground">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Post
          </Button>
        </div>

        {/* Filters */}
        <Card className="admin-card">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending Review</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="font-display">All Posts ({filteredPosts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading posts...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-destructive">{error}</p>
                <Button onClick={fetchPosts} className="mt-4">
                  Try Again
                </Button>
              </div>
            ) : (
              <DataTable
                data={filteredPosts}
                columns={columns}
                searchKey="title"
                searchPlaceholder="Search posts..."
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedPost?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
