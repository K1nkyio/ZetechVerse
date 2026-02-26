import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { postsApi, Post } from "@/api/posts.api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, ArrowLeft, Calendar, Eye, Heart, MessageSquare, User } from "lucide-react";

export default function AdminViewPost() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = location.pathname.startsWith("/super-admin");
  const layoutVariant = isSuperAdmin ? "super-admin" : "admin";
  const postsPath = isSuperAdmin ? "/super-admin/posts" : "/admin/posts";
  const editPath = isSuperAdmin ? `/super-admin/edit/${id}` : `/admin/edit/${id}`;

  useEffect(() => {
    if (id) {
      fetchPost();
    }
  }, [id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const data = await postsApi.getPostById(id!);
      setPost(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load post",
        variant: "destructive",
      });
      navigate(postsPath);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout variant={layoutVariant}>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Card className="admin-card">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  if (!post) {
    return (
      <AdminLayout variant={layoutVariant}>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Post Not Found</h1>
            <p className="text-muted-foreground">The post you're looking for doesn't exist.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout variant={layoutVariant}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(postsPath)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-display text-foreground">{post.title}</h1>
              <p className="text-muted-foreground">Preview your post</p>
            </div>
          </div>
          <Button onClick={() => navigate(editPath)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Featured Image */}
            {post.image_url && (
              <Card className="admin-card overflow-hidden">
                <img
                  src={post.image_url}
                  alt={post.title}
                  className="w-full h-64 object-cover"
                />
              </Card>
            )}

            {/* Content */}
            <Card className="admin-card">
              <CardHeader>
                <CardTitle>Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {post.excerpt && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Excerpt</p>
                    <p className="text-foreground italic">{post.excerpt}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Full Content</p>
                  <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                    {post.content}
                  </div>
                </div>

                {post.tags && post.tags.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Post Information */}
            <Card className="admin-card">
              <CardHeader>
                <CardTitle>Post Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <StatusBadge status={post.status} />
                </div>

                {post.category_name && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Category</p>
                    <Badge variant="outline" className="capitalize">{post.category_name}</Badge>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{post.author_name || post.author_username}</p>
                    <p className="text-xs text-muted-foreground">Author</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm">{new Date(post.created_at).toLocaleDateString()}</p>
                    <p className="text-xs text-muted-foreground">Created</p>
                  </div>
                </div>

                {post.updated_at && post.updated_at !== post.created_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm">{new Date(post.updated_at).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">Last Updated</p>
                    </div>
                  </div>
                )}

                {post.published_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm">{new Date(post.published_at).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">Published</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card className="admin-card">
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Views</span>
                  </div>
                  <span className="font-medium">{post.views_count.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Likes</span>
                  </div>
                  <span className="font-medium">{post.likes_count.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Comments</span>
                  </div>
                  <span className="font-medium">{post.comments_count.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
