import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { postsApi, Post as ApiPost } from '@/api/posts.api';
import { 
  Search,
  Clock,
  User,
  BookOpen,
  Lightbulb,
  Briefcase,
  Heart,
  GraduationCap,
  Coins,
  Coffee,
  Loader2
} from 'lucide-react';

// Utility function for debouncing
const debounce = <T extends (...args: any[]) => any>(func: T, wait: number): T => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  } as T;
};

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  image: string;
  video?: string;
  author: string;
  readTime: string;
  date: string;
  featured: boolean;
}

const categories = [
  { id: 'all', name: 'All', icon: BookOpen },
  { id: 'uncategorized', name: 'Uncategorized', icon: BookOpen },
  { id: 'finance', name: 'Finance', icon: Coins },
  { id: 'tech', name: 'Tech & Innovation', icon: Lightbulb },
  { id: 'career', name: 'Careers', icon: Briefcase },
  { id: 'campus', name: 'Campus Life', icon: Coffee },
  { id: 'wellness', name: 'Wellness', icon: Heart },
  { id: 'success', name: 'Success Stories', icon: GraduationCap },
];

const blogPosts = [];

const Explore = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Optimized fetch function with debouncing
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[Explore] Fetching posts...');
      
      // Fetch with smaller batch size for faster initial load
      const response = await postsApi.getPosts({ 
        status: 'published',
        limit: 20,
        page: 1
      });

      console.log('[Explore] API Response:', response);
      console.log('[Explore] Posts count:', response.posts.length);

      // Process posts efficiently
      const formattedPosts: BlogPost[] = response.posts.map((post: ApiPost) => {
        // Debug category mapping
        const originalCategory = post.category_name || 'Uncategorized';
        const mappedCategory = mapCategoryName(originalCategory);
        console.log('[Explore] Category mapping:', {
          original: post.category_name,
          originalCategory,
          mapped: mappedCategory,
          categoryId: post.category_id,
          finalCategory: mappedCategory === 'uncategorized' ? 'UNCATEGORIZED (needs backend fix)' : mappedCategory
        });
        
        // Efficient excerpt generation
        const excerpt = post.excerpt || 
          (post.content ? 
            (post.content.length > 120 ? 
              post.content.substring(0, 120) + '...' : 
              post.content
            ) : 
            'No content available'
          );
        
        // Efficient read time calculation
        const wordCount = post.content ? 
          (post.content.match(/\S+/g) || []).length : 
          0;
        const readTime = Math.max(1, Math.min(30, Math.ceil(wordCount / 200)));
        
        return {
          id: post.id.toString(),
          title: post.title,
          excerpt: excerpt,
          category: mappedCategory,
          image: post.image_url || '/placeholder.svg',
          video: post.video_url,
          author: post.author_name || post.author_username || 'Anonymous',
          readTime: `${readTime} min read`,
          date: new Date(post.created_at).toLocaleDateString(),
          featured: false
        };
      });

      console.log('[Explore] Formatted posts:', formattedPosts);
      setBlogPosts(formattedPosts);
    } catch (err: any) {
      console.error('[Explore] Failed to fetch posts:', err);
      setError('Failed to load posts. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      // Implement search logic here if needed
      console.log('Searching for:', query);
    }, 300),
    []
  );

  useEffect(() => {
    if (searchQuery) {
      debouncedSearch(searchQuery);
    }
  }, [searchQuery, debouncedSearch]);

  // Map database category names to frontend category IDs
  const mapCategoryName = (categoryName: string): string => {
    // Handle null/undefined/empty cases
    if (!categoryName || categoryName.trim() === '') {
      return 'uncategorized';
    }
    
    const lowerCategory = categoryName.toLowerCase();
    
    // Direct mapping for exact matches - COMPREHENSIVE MAPPING
    const categoryMap: { [key: string]: string } = {
      // Tech categories
      'technology': 'tech',
      'design': 'tech', 
      'development': 'tech',
      'ai & ml': 'tech',
      'startup': 'tech',
      'tutorial': 'tech',
      
      // Career categories
      'career': 'career',
      'careers': 'career',
      'personal development': 'career',
      
      // Finance categories
      'finance': 'finance',
      
      // Wellness categories
      'health': 'wellness',
      'beauty': 'wellness',
      'mindfulness': 'wellness',
      'spirituality': 'wellness',
      
      // Success categories
      'education': 'success',
      
      // Campus/Lifestyle categories
      'news': 'campus',
      'entertainment': 'campus',
      'sports': 'campus',
      'travel': 'campus',
      'food': 'campus',
      'relationship': 'campus',
      'gardening': 'campus',
      'cooking': 'campus'
    };
    
    return categoryMap[lowerCategory] || 'uncategorized';
  };

  // Filter posts efficiently
  const filteredPosts = blogPosts.filter((post) => {
    const matchesCategory = activeCategory === 'all' || post.category === activeCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Separate featured and regular posts
  const featuredPosts = filteredPosts.filter(p => p.featured);
  const regularPosts = filteredPosts.filter(p => !p.featured);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Explore</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Curated content for Zetech students. Discover articles on finance, technology, 
            careers, campus life, and more.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search articles..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Categories */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-8">
          <TabsList className="flex flex-wrap justify-center h-auto gap-2 bg-transparent p-0">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4"
                >
                  <Icon className="h-4 w-4" />
                  {cat.name}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Featured Posts */}
        {featuredPosts.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold mb-6">Featured</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {featuredPosts.map((post) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.id}`}
                  className="group block"
                >
                  <article className="relative h-[300px] rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
                    {post.video ? (
                      <video
                        src={post.video}
                        className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={post.image}
                        alt={post.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <Badge className="mb-3 capitalize">{post.category}</Badge>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {post.author}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {post.readTime}
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* All Posts */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading posts...</span>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchPosts} variant="outline">Try Again</Button>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold mb-6">
              {activeCategory === 'all' ? 'All Articles' : `${categories.find(c => c.id === activeCategory)?.name}`}
              <span className="text-muted-foreground font-normal ml-2">({regularPosts.length})</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularPosts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.id}`}
                className="group block bg-card rounded-2xl border border-border overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all"
              >
                <div className="aspect-video bg-gradient-to-br from-primary/10 to-accent/10">
                  {post.video ? (
                    <video
                      src={post.video}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="capitalize">{post.category}</Badge>
                    <span className="text-xs text-muted-foreground">{post.date}</span>
                  </div>
                  <h3 className="font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {post.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {post.readTime}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
        )}
        
        {!loading && !error && filteredPosts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No articles found. Try a different search or category.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Explore;
