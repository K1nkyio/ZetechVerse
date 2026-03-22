import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BlogCard from '@/components/BlogCard';
import { Input } from '@/components/ui/input';
import { Search, X, Bookmark, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { postsApi } from '@/api/posts.api';
import { getStored, setStored, upsertRecent } from '@/lib/storage';
import { trackEvent } from '@/lib/analytics';
import PageHeader from '@/components/ui/page-header';

const RECENT_SEARCHES_KEY = 'zv:recent-searches';
const SAVED_SEARCHES_KEY = 'zv:saved-searches';

type ResultPost = {
  id: string;
  title: string;
  category: string;
  date: string;
  excerpt: string;
  image: string;
  href: string;
  views: number;
};

const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [posts, setPosts] = useState<ResultPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'relevance' | 'recent' | 'popular'>('relevance');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getStored<string[]>(RECENT_SEARCHES_KEY, []));
  const [savedSearches, setSavedSearches] = useState<string[]>(() => getStored<string[]>(SAVED_SEARCHES_KEY, []));

  const currentQuery = searchParams.get('q') || '';

  const loadPosts = async (query: string) => {
    if (!query.trim()) {
      setPosts([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await postsApi.getPosts({
        status: 'published',
        search: query.trim(),
        limit: 30,
      });

      const mapped = (response.posts || []).map((post: any) => ({
        id: String(post.id),
        title: post.title,
        category: post.category_name || 'General',
        date: new Date(post.created_at).toLocaleDateString(),
        excerpt: post.excerpt || post.content?.slice(0, 140) + '...',
        image: post.image_url || '/placeholder.svg',
        href: `/blog/${post.id}`,
        views: Number(post.views_count || 0),
      }));

      setPosts(mapped);
      trackEvent('search_results_loaded', { query, count: mapped.length });
    } catch (err: any) {
      setError(err.message || 'Failed to load search results');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const queryParam = searchParams.get('q') || '';
    setSearchQuery(queryParam);
    void loadPosts(queryParam);
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    upsertRecent(RECENT_SEARCHES_KEY, trimmed, 8);
    setRecentSearches(getStored<string[]>(RECENT_SEARCHES_KEY, []));
    setSearchParams({ q: trimmed });
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchParams({});
    setPosts([]);
  };

  const handleSaveSearch = () => {
    const trimmed = currentQuery.trim();
    if (!trimmed) return;
    const next = upsertRecent(SAVED_SEARCHES_KEY, trimmed, 12);
    setSavedSearches(next);
    trackEvent('search_saved', { query: trimmed });
  };

  const sortedPosts = useMemo(() => {
    const copy = [...posts];
    if (sortBy === 'popular') {
      return copy.sort((a, b) => b.views - a.views);
    }
    if (sortBy === 'recent') {
      return copy.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return copy;
  }, [posts, sortBy]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="container-blog py-10">
        <div className="max-w-5xl mx-auto">
          <PageHeader
            title="Search Results"
            description="Find articles and revisit your recent or saved searches."
            icon={<Search className="h-6 w-6 text-primary" aria-hidden="true" />}
          />

          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative max-w-xl">
              <label htmlFor="search-input" className="sr-only">Search articles</label>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="search-input"
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-12 py-3"
                aria-label="Search articles"
              />
              {searchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-9 w-9 p-0"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
              <SelectTrigger className="w-44" aria-label="Sort search results">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Most Relevant</SelectItem>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="popular">Most Viewed</SelectItem>
              </SelectContent>
            </Select>
            {currentQuery && (
              <Button variant="outline" className="gap-2" onClick={handleSaveSearch}>
                <Bookmark className="h-4 w-4" />
                Save Search
              </Button>
            )}
          </div>

          {(recentSearches.length > 0 || savedSearches.length > 0) && (
            <div className="mb-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border p-4">
                <p className="font-medium text-sm mb-3 inline-flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  Recent Searches
                </p>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term) => (
                    <Button key={term} size="sm" variant="secondary" onClick={() => setSearchParams({ q: term })}>
                      {term}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="font-medium text-sm mb-3 inline-flex items-center gap-2">
                  <Bookmark className="h-4 w-4 text-primary" />
                  Saved Searches
                </p>
                <div className="flex flex-wrap gap-2">
                  {savedSearches.map((term) => (
                    <Button key={term} size="sm" variant="secondary" onClick={() => setSearchParams({ q: term })}>
                      {term}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentQuery ? (
            <div>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="space-y-4">
                      <Skeleton className="h-48 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <h2 className="text-2xl font-semibold text-foreground mb-4">Error loading results</h2>
                  <p className="text-muted-foreground mb-6">{error}</p>
                </div>
              ) : sortedPosts.length > 0 ? (
                <>
                  <div className="mb-6">
                    <p className="text-lg text-muted-foreground">
                      Found {sortedPosts.length} result{sortedPosts.length === 1 ? '' : 's'} for "{currentQuery}"
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {sortedPosts.map((post) => (
                      <BlogCard
                        key={post.id}
                        title={post.title}
                        category={post.category}
                        date={post.date}
                        excerpt={post.excerpt}
                        image={post.image}
                        href={post.href}
                        isSmall={false}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <h2 className="text-2xl font-semibold text-foreground mb-4">No articles found</h2>
                  <p className="text-muted-foreground mb-6">
                    No results found for "{currentQuery}". Try adjusting your search terms or browse categories.
                  </p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <Button variant="outline" onClick={() => navigate('/explore')}>Explore</Button>
                    <Button variant="outline" onClick={() => navigate('/marketplace')}>Marketplace</Button>
                    <Button variant="outline" onClick={() => navigate('/opportunities')}>Opportunities</Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold text-foreground mb-4">What are you looking for?</h2>
              <p className="text-muted-foreground mb-6">
                Enter a search term above to find articles, or start with saved searches.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button variant="outline" onClick={() => navigate('/explore')}>Explore</Button>
                <Button variant="outline" onClick={() => navigate('/marketplace')}>Marketplace</Button>
                <Button variant="outline" onClick={() => navigate('/events')}>Events</Button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SearchResults;
