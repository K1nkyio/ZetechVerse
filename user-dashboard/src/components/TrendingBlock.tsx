import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import BlogCard from './BlogCard';
import { postsApi, Post as ApiPost } from '@/api/posts.api';
import { useToast } from '@/hooks/use-toast';

interface TrendingPost {
  id: string;
  title: string;
  category: string;
  date: string;
  excerpt: string;
  image: string;
}

const TrendingBlock = () => {
  const { toast } = useToast();
  const [posts, setPosts] = useState<TrendingPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await postsApi.getPosts({ status: 'published', limit: 6, sort_by: 'views_count', sort_order: 'DESC' });
      const formattedPosts: TrendingPost[] = response.posts.map((post: ApiPost, index: number) => ({
        id: post.id.toString(),
        title: post.title,
        category: post.category_name || 'Uncategorized',
        date: new Date(post.created_at).toLocaleDateString(),
        excerpt: post.excerpt || post.content.substring(0, 150) + '...',
        image: post.image_url || '/placeholder.svg'
      }));
      setPosts(formattedPosts);
    } catch (err: any) {
      console.error('Failed to fetch trending posts:', err);
      toast({
        title: 'Error',
        description: 'Could not load trending posts. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="container-blog py-16 bg-muted/30">
        <h2 id="trending-heading" className="section-title mb-8">Trending</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((item) => (
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
    <section className="container-blog py-16 bg-muted/30">
      <h2 id="trending-heading" className="section-title mb-8">Trending</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {posts.map((post, index) => (
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
        ))}
      </div>
    </section>
  );
};

export default TrendingBlock;