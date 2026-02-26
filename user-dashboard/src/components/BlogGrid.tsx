import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import BlogCard from './BlogCard';
import { postsApi, Post as ApiPost } from '@/api/posts.api';
import { useToast } from '@/hooks/use-toast';

interface BlogPost {
  id: string;
  title: string;
  category: string;
  date: string;
  excerpt: string;
  image: string;
}

const BlogGrid = () => {
  const { toast } = useToast();
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await postsApi.getPosts({ status: 'published', limit: 12 });
      const formattedPosts: BlogPost[] = response.posts.map((post: ApiPost) => ({
        id: post.id.toString(),
        title: post.title,
        category: post.category_name || 'Uncategorized',
        date: new Date(post.created_at).toLocaleDateString(),
        excerpt: post.excerpt || post.content.substring(0, 150) + '...',
        image: post.image_url || '/placeholder.svg'
      }));
      setBlogPosts(formattedPosts);
    } catch (err: any) {
      console.error('Failed to fetch posts:', err);
      toast({
        title: 'Error',
        description: 'Could not load blog posts. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="container-blog py-16">
        <h2 id="all-posts-heading" className="section-title mb-8">All Posts</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((item) => (
            <div key={item} className="animate-pulse">
              <div className="aspect-video bg-muted rounded-lg mb-4"></div>
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="container-blog py-16">
      <h2 id="all-posts-heading" className="section-title mb-8">All Posts</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {blogPosts.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3 text-center py-12">
            <p className="text-muted-foreground">No blog posts available.</p>
          </div>
        ) : (
          blogPosts.map((post, index) => (
            <Link key={post.id} to={`/blog/${post.id}`} className="block">
              <BlogCard
                title={post.title}
                category={post.category}
                date={post.date}
                excerpt={index < 3 ? post.excerpt : undefined}
                image={post.image}
                isSmall={index >= 3}
              />
            </Link>
          ))
        )}
      </div>
    </section>
  );
};

export default BlogGrid;