import { AdminLayout } from "@/components/admin/AdminLayout";
import { PostForm } from "@/components/admin/PostForm";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { postsApi } from "@/api/posts.api";

export default function AdminCreatePost() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (data: any) => {
    try {
      // Transform camelCase field names to snake_case for backend
      const transformedData = {
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        category: data.category,
        tags: data.tags,
        featured_image: data.featuredImage, // Transform from featuredImage to featured_image
        video_url: data.videoUrl,
        status: data.status
      };

      await postsApi.createPost(transformedData);
      toast({
        title: "Success",
        description: "Post created successfully",
      });
      navigate('/admin/posts');
    } catch (error: any) {
      console.error("Error creating post:", error);

      // Show detailed validation errors
      let errorMessage = error.message || error.error || "Failed to create post";
      const validationErrors = Array.isArray(error?.errors)
        ? error.errors
        : Array.isArray(error?.data?.errors)
          ? error.data.errors
          : [];

      if (validationErrors.length > 0) {
        errorMessage = validationErrors
          .map((err: any) => {
            const field = err.field || err.path || err.param;
            const msg = err.message || err.msg || 'Validation failed';
            return field ? `${field}: ${msg}` : msg;
          })
          .join(', ');
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <AdminLayout variant="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Create New Post</h1>
          <p className="text-muted-foreground">Write and submit your content for review</p>
        </div>

        <PostForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/admin/posts')}
        />
      </div>
    </AdminLayout>
  );
}
