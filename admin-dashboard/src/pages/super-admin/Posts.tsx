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
import { Eye, Edit, Trash2, MoreHorizontal, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { postsApi, Post as ApiPost } from "@/api/posts.api";
import { useNavigate } from "react-router-dom";

interface Post {
  id: string;
  title: string;
  author: string;
  category: string;
  status: 'draft' | 'pending' | 'published' | 'rejected';
  date: string;
  views: number;
}

export default function SuperAdminPosts() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    fetchPosts();
  }, [statusFilter]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await postsApi.getPosts({
        status: statusFilter as any
      });
      const formattedPosts: Post[] = response.posts.map((post: ApiPost) => ({
        id: post.id.toString(),
        title: post.title,
        author: post.author_name || post.author_username || 'Anonymous',
        category: post.category_name || 'Uncategorized',
        status: post.status,
        date: new Date(post.created_at).toLocaleDateString(),
        views: post.views_count
      }));
      setPosts(formattedPosts);
    } catch (err: any) {
      console.error('Failed to fetch posts:', err);
      toast({
        title: 'Error',
        description: 'Could not load posts. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter((post) => {
    if (statusFilter !== "all" && post.status !== statusFilter) return false;
    if (categoryFilter !== "all" && post.category !== categoryFilter) return false;
    return true;
  });

  const handleView = (post: Post) => {
    navigate(`/super-admin/posts/${post.id}`);
  };

  const handleEdit = (post: Post) => {
    navigate(`/super-admin/edit/${post.id}`);
  };

  const handleDelete = async (post: Post) => {
    if (!window.confirm(`Are you sure you want to delete "${post.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await postsApi.deletePost(post.id);
      toast({
        title: 'Success',
        description: 'Post deleted successfully',
      });
      // Refresh the posts list
      fetchPosts();
    } catch (err: any) {
      console.error('Failed to delete post:', err);
      toast({
        title: 'Error',
        description: err.message || 'Could not delete post. Please try again later.',
        variant: 'destructive',
      });
    }
  };

  const handleApprove = async (post: Post) => {
    try {
      await postsApi.reviewPost(post.id, 'approve');
      toast({
        title: 'Success',
        description: 'Post approved successfully',
      });
      // Refresh the posts list
      fetchPosts();
    } catch (err: any) {
      console.error('Failed to approve post:', err);
      toast({
        title: 'Error',
        description: err.message || 'Could not approve post. Please try again later.',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (post: Post) => {
    try {
      await postsApi.reviewPost(post.id, 'reject');
      toast({
        title: 'Success',
        description: 'Post rejected successfully',
      });
      // Refresh the posts list
      fetchPosts();
    } catch (err: any) {
      console.error('Failed to reject post:', err);
      toast({
        title: 'Error',
        description: err.message || 'Could not reject post. Please try again later.',
        variant: 'destructive',
      });
    }
  };

  const handleAction = (action: string, post: Post) => {
    toast({
      title: `${action} Post`,
      description: `${action} "${post.title}" successfully`,
    });
  };

  const categories = posts.length > 0 ? [...new Set(posts.map((p) => p.category))] : [];

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
      key: "author",
      header: "Author",
      render: (post) => <span className="text-muted-foreground">{post.author}</span>,
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
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(post)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {post.status === "pending" && (
              <>
                <DropdownMenuItem onClick={() => handleApprove(post)} className="text-success">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleReject(post)} className="text-destructive">
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem onClick={() => handleDelete(post)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <AdminLayout variant="super-admin">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Posts Management</h1>
            <p className="text-muted-foreground">Manage all posts across the platform</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="text-base font-display">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="admin-card">
          <CardContent className="pt-6">
            <DataTable
              data={loading ? [] : filteredPosts}
              columns={columns}
              searchKey="title"
              searchPlaceholder="Search posts..."
            />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
