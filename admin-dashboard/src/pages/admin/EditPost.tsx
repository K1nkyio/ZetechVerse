import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PostForm } from "@/components/admin/PostForm";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { postsApi, Post } from "@/api/posts.api";
import { Loader2 } from "lucide-react";

export default function AdminEditPost() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = location.pathname.startsWith("/super-admin");
  const layoutVariant = isSuperAdmin ? "super-admin" : "admin";
  const postsPath = isSuperAdmin ? "/super-admin/posts" : "/admin/posts";

  useEffect(() => {
    if (id) {
      fetchPost();
    }
  }, [id]);

  const fetchPost = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await postsApi.getPostById(id);
      setPost(data);
    } catch (err: any) {
      console.error('Failed to fetch post:', err);
      setError('Failed to load post');
      toast({
        title: 'Error',
        description: 'Failed to load post',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    if (!id) return;

    try {
      // Transform camelCase field names to snake_case for backend
      const transformedData = {
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        category: data.category,
        tags: data.tags,
        featured_image: data.featuredImage,
        video_url: data.videoUrl,
        status: data.status
      };

      await postsApi.updatePost(id, transformedData);
      toast({
        title: "Success",
        description: "Post updated successfully",
      });
      navigate(postsPath);
    } catch (error: any) {
      console.error("Error updating post:", error);

      let errorMessage = error.message || error.error || "Failed to update post";
      if (error.errors && Array.isArray(error.errors)) {
        errorMessage = error.errors.map((err: any) => err.message || err.msg).join(', ');
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <AdminLayout variant={layoutVariant}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading post...</span>
        </div>
      </AdminLayout>
    );
  }

  if (error || !post) {
    return (
      <AdminLayout variant={layoutVariant}>
        <div className="text-center py-12">
          <p className="text-destructive mb-4">{error || 'Post not found'}</p>
          <button
            onClick={() => navigate(postsPath)}
            className="text-primary hover:underline"
          >
            Back to Posts
          </button>
        </div>
      </AdminLayout>
    );
  }

  // Transform post data to match form expectations
  const initialData = {
    title: post.title,
    content: post.content,
    excerpt: post.excerpt || '',
    category: post.category_name || '',
    tags: post.tags || [],
    featuredImage: post.image_url || '',
    videoUrl: post.video_url || '',
    status: post.status
  };

  return (
    <AdminLayout variant={layoutVariant}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Edit Post</h1>
          <p className="text-muted-foreground">Update your content</p>
        </div>

        <PostForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={() => navigate(postsPath)}
          isEditing={true}
        />
      </div>
    </AdminLayout>
  );
}
