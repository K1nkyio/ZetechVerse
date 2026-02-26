import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { postsApi, Post as ApiPost } from '@/api/posts.api';
import { useToast } from '@/hooks/use-toast';

interface MasonryPost {
  id: string;
  title: string;
  category: string;
  date: string;
  excerpt: string;
  image: string;
  height: string;
}

const MasonryBlock = () => {
  const { toast } = useToast();
  const [posts, setPosts] = useState<MasonryPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      const response = await postsApi.getPosts({ status: 'published', limit: 6 });
      const formattedPosts: MasonryPost[] = response.posts.map((post: ApiPost, index: number) => ({
        id: post.id.toString(),
        title: post.title,
        category: post.category_name || 'Uncategorized',
        date: new Date(post.created_at).toLocaleDateString(),
        excerpt: post.excerpt || post.content.substring(0, 100) + '...',
        image: post.image_url || '/placeholder.svg',
        height: index === 0 ? 'tall' : index % 3 === 0 ? 'short' : 'medium'
      }));
      setPosts(formattedPosts);
    } catch (err: unknown) {
      console.error('Failed to fetch masonry posts:', err);
      toast({
        title: 'Error',
        description: 'Could not load featured stories. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  const getHeightClass = (height: string) => {
    switch (height) {
      case 'tall':
        return 'row-span-3';
      case 'medium':
        return 'row-span-2';
      case 'short':
        return 'row-span-1';
      default:
        return 'row-span-2';
    }
  };

  // Ensure even number of items
  const displayPosts = posts.length % 2 === 0 
    ? posts 
    : posts.slice(0, -1);

  if (loading) {
    return (
      <section className="container-blog py-16">
        <h2 id="masonry-heading" className="section-title mb-8">Featured Stories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-[180px] [grid-auto-flow:row_dense]">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="animate-pulse rounded-lg overflow-hidden bg-card border border-border row-span-2">
              <div className="w-full h-full bg-muted"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="container-blog py-16">
      <h2 id="masonry-heading" className="section-title mb-8">Featured Stories</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-[180px] [grid-auto-flow:row_dense]">
        {displayPosts.map((post, index) => (
          <Link to={`/blog/${post.id}`} key={post.id} className="block">
            <article
              className={`group cursor-pointer ${getHeightClass(post.height)} transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="relative w-full h-full rounded-lg overflow-hidden bg-card border border-border">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                  width="294"
                  height={post.height === 'tall' ? '540' : post.height === 'medium' ? '360' : '180'}
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 294px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium bg-primary/80 px-2 py-1 rounded-full">
                      {post.category}
                    </span>
                    <span className="text-xs opacity-80">{post.date}</span>
                  </div>
                  <h3 className="font-bold text-sm md:text-base mb-2 line-clamp-2">
                    {post.title}
                  </h3>
                  {hoveredIndex === index && post.excerpt && (
                    <p className="text-xs opacity-90 line-clamp-2 transition-opacity duration-300">
                      {post.excerpt}
                    </p>
                  )}
                </div>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default MasonryBlock;
