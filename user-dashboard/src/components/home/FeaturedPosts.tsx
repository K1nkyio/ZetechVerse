import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { postsApi, Post } from '@/api/posts.api';
import { getExperimentVariant, trackEvent } from '@/lib/analytics';

interface FeaturedPost {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  image: string;
  author: string;
  readTime: string;
}

const FeaturedPosts = () => {
  const cardLayoutVariant = getExperimentVariant('featured_card_layout', ['classic', 'elevated']);
  const [featuredPosts, setFeaturedPosts] = useState<FeaturedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFeaturedPosts();
    trackEvent('experiment_exposure', { experiment: 'featured_card_layout', variant: cardLayoutVariant });
  }, [cardLayoutVariant]);

  const fetchFeaturedPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const posts = await postsApi.getFeaturedPosts(6);

      const formattedPosts: FeaturedPost[] = posts.slice(0, 6).map((post: Post) => ({
        id: post.id.toString(),
        title: post.title,
        excerpt: post.excerpt || post.content.substring(0, 150) + '...',
        category: post.category_name || 'General',
        image: post.image_url || '/placeholder.svg',
        author: post.author_name || post.author_username || 'Anonymous',
        readTime: `${Math.ceil(post.content.length / 1000)} min read`
      }));

      setFeaturedPosts(formattedPosts);
    } catch (err: any) {
      console.error('Failed to fetch featured posts:', err);
      setError('Failed to load featured posts');
    } finally {
      setLoading(false);
    }
  };
  return (
    <section className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-display font-semibold tracking-tight">Featured Posts</h2>
            <p className="text-muted-foreground mt-2">Discover curated content for Zetech students. Explore articles on finance, technology, careers, campus life, and more.</p>
          </div>
          <Button variant="ghost" asChild className="gap-2 w-full sm:w-auto">
            <Link to="/explore">
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="rounded-2xl border border-border overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="lg:col-span-3 text-center py-12">
              <p className="text-destructive">{error}</p>
              <Button onClick={fetchFeaturedPosts} variant="outline" className="mt-4">
                Try Again
              </Button>
            </div>
          ) : featuredPosts.length === 0 ? (
            <div className="lg:col-span-3 text-center py-12">
              <p className="text-muted-foreground">No featured posts available.</p>
            </div>
          ) : (
            <>
              {/* Featured Large Card */}
              <div className="lg:col-span-2 lg:row-span-2">
                <Link to={`/blog/${featuredPosts[0].id}`} className="block group h-full">
                  <article className="relative h-full min-h-[400px] rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
                    <img
                      src={featuredPosts[0].image}
                      alt={featuredPosts[0].title}
                      className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <Badge className="mb-3">{featuredPosts[0].category}</Badge>
                      <h3 className="text-2xl md:text-3xl font-display font-semibold tracking-tight mb-3 group-hover:text-primary transition-colors">
                        {featuredPosts[0].title}
                      </h3>
                      <p className="text-muted-foreground mb-4 line-clamp-2">
                        {featuredPosts[0].excerpt}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {featuredPosts[0].author}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {featuredPosts[0].readTime}
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              </div>

              {/* Smaller Cards */}
              {featuredPosts.slice(1).map((post) => (
                <Link key={post.id} to={`/blog/${post.id}`} className="block group">
                  <article
                    className={`h-full p-6 rounded-2xl border transition-colors ${
                      cardLayoutVariant === 'elevated'
                        ? 'bg-gradient-to-b from-card to-muted/30 shadow-md hover:shadow-lg border-primary/20'
                        : 'bg-card border-border hover:border-primary/50'
                    }`}
                  >
                    <Badge variant="secondary" className="mb-3">{post.category}</Badge>
                    <h3 className="text-lg font-display font-semibold tracking-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {post.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.readTime}
                      </span>
                    </div>
                  </article>
                </Link>
              ))}
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default FeaturedPosts;
