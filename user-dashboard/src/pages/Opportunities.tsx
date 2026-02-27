import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PageHeader from '@/components/ui/page-header';
import { 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  Building2,
  Briefcase,
  GraduationCap,
  Trophy,
  BookOpen,
  ExternalLink,
  AlertCircle,
  Bookmark,
  History
} from 'lucide-react';

import { opportunitiesApi, type Opportunity } from '@/api/opportunities.api';
import SocialShare from '@/components/SocialShare';
import { getStored, setStored, upsertRecent } from '@/lib/storage';
import { trackEvent } from '@/lib/analytics';

const categories = [
  { id: 'all', name: 'All', icon: Briefcase },
  { id: 'internship', name: 'Internships', icon: GraduationCap },
  { id: 'attachment', name: 'Attachments', icon: BookOpen },
  { id: 'job', name: 'Jobs', icon: Briefcase },
  { id: 'scholarship', name: 'Scholarships', icon: Trophy },
];

const Opportunities = () => {
  const [activeCategory, setActiveCategory] = useState(getStored<string>('zv:opps:category', 'all'));
  const [searchQuery, setSearchQuery] = useState(getStored<string>('zv:opps:search', ''));
  const [sortBy, setSortBy] = useState<'newest' | 'deadline' | 'views'>(
    getStored<'newest' | 'deadline' | 'views'>('zv:opps:sort', 'newest')
  );
  const [savedSearches, setSavedSearches] = useState<string[]>(() => getStored<string[]>('zv:opps:saved', []));
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getStored<string[]>('zv:opps:recent', []));
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // Fetch opportunities
  useEffect(() => {
    const fetchOpportunities = async () => {
      try {
        setLoading(true);
        setError(null);

        const filters = {
          page: 1,
          limit: 10,
          type: activeCategory === 'all' ? undefined : activeCategory,
          search: searchQuery || undefined
        };

        const response = await opportunitiesApi.getOpportunities(filters);
        setOpportunities(response.opportunities || []);
        setPagination(response.pagination || { page: 1, limit: 10, total: 0, pages: 0 });
      } catch (err: any) {
        console.error('Failed to fetch opportunities:', err);
        setError(err.message || 'Failed to load opportunities');
        setOpportunities([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce search, but execute category changes immediately
    const timeout = setTimeout(() => {
      fetchOpportunities();
    }, searchQuery ? 500 : 0);

    return () => clearTimeout(timeout);
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    setStored('zv:opps:category', activeCategory);
    setStored('zv:opps:search', searchQuery);
    setStored('zv:opps:sort', sortBy);
  }, [activeCategory, searchQuery, sortBy]);

  // Handle search change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      setRecentSearches(upsertRecent('zv:opps:recent', value.trim(), 8));
    }
  };

  // Fetch function for pagination buttons
  const fetchPage = async (page: number) => {
    try {
      setLoading(true);
      setError(null);

      const filters = {
        page,
        limit: 10,
        type: activeCategory === 'all' ? undefined : activeCategory,
        search: searchQuery || undefined
      };

      const response = await opportunitiesApi.getOpportunities(filters);
      setOpportunities(response.opportunities || []);
      setPagination(response.pagination || { page: 1, limit: 10, total: 0, pages: 0 });
    } catch (err: any) {
      console.error('Failed to fetch opportunities:', err);
      setError(err.message || 'Failed to load opportunities');
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setPagination(prev => ({ ...prev, page: 1 }));
    trackEvent('opportunities_filter_category', { category });
  };

  const saveCurrentSearch = () => {
    if (!searchQuery.trim()) return;
    const next = upsertRecent('zv:opps:saved', searchQuery.trim(), 10);
    setSavedSearches(next);
    toast({ title: 'Search saved', description: `"${searchQuery.trim()}" added to saved searches.` });
  };

  const sortedOpportunities = [...opportunities].sort((a, b) => {
    if (sortBy === 'views') return Number(b.views_count || 0) - Number(a.views_count || 0);
    if (sortBy === 'deadline') {
      const aDeadline = a.application_deadline ? new Date(a.application_deadline).getTime() : Number.MAX_SAFE_INTEGER;
      const bDeadline = b.application_deadline ? new Date(b.application_deadline).getTime() : Number.MAX_SAFE_INTEGER;
      return aDeadline - bDeadline;
    }
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Hero */}
        <PageHeader
          title="Opportunities Board"
          icon={<Briefcase className="h-6 w-6 text-primary" aria-hidden="true" />}
          description="Discover internships, attachments, jobs, and scholarships curated for Zetech students."
          centered
        />

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by title or company..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              aria-label="Search opportunities"
            />
          </div>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="deadline">Closest Deadline</SelectItem>
              <SelectItem value="views">Most Viewed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={saveCurrentSearch} disabled={!searchQuery.trim()}>
            <Bookmark className="h-4 w-4" />
            Save Search
          </Button>
        </div>

        {(recentSearches.length > 0 || savedSearches.length > 0) && (
          <div className="grid gap-3 md:grid-cols-2 mb-6">
            <div className="rounded-xl border border-border p-3">
              <p className="text-sm font-medium inline-flex items-center gap-2 mb-2">
                <History className="h-4 w-4 text-primary" />
                Recent
              </p>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <Button key={term} variant="secondary" size="sm" onClick={() => setSearchQuery(term)}>
                    {term}
                  </Button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-sm font-medium inline-flex items-center gap-2 mb-2">
                <Bookmark className="h-4 w-4 text-primary" />
                Saved
              </p>
              <div className="flex flex-wrap gap-2">
                {savedSearches.map((term) => (
                  <Button key={term} variant="secondary" size="sm" onClick={() => setSearchQuery(term)}>
                    {term}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Categories */}
        <Tabs value={activeCategory} onValueChange={handleCategoryChange} className="mb-8">
          <TabsList className="flex-wrap h-auto gap-2 bg-transparent p-0">
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

        {/* Results Count */}
        {loading ? (
          <Skeleton className="h-6 w-48 mb-6" />
        ) : (
          <p className="text-muted-foreground mb-6">
            Showing {opportunities.length} of {pagination.total} opportunities
          </p>
        )}

        {/* Error State */}
        {error && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Opportunities List */}
        <div className="space-y-4">
          {loading ? (
            // Loading skeletons
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="group p-6 bg-card rounded-2xl border border-border">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <Skeleton className="w-16 h-16 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                    <Skeleton className="h-8 w-3/4" />
                    <div className="flex gap-4">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                    <Skeleton className="h-16 w-full" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-14" />
                    </div>
                  </div>
                  <Skeleton className="w-32 h-10" />
                </div>
              </div>
            ))
          ) : (
            sortedOpportunities.map((opp) => (
            <Link
              key={opp.id}
              to={`/opportunities/${opp.id}`}
              className="block group p-6 bg-card rounded-2xl border border-border hover:border-primary/50 hover:shadow-lg transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="p-4 rounded-xl bg-primary/10 shrink-0">
                  <Briefcase className="h-8 w-8 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="outline" className="capitalize">{opp.type}</Badge>
                      <Badge variant={opp.status === 'active' ? 'secondary' : 'destructive'} className="capitalize">
                        {opp.status}
                      </Badge>
                      {opp.days_until_deadline !== undefined && opp.days_until_deadline <= 7 && opp.days_until_deadline > 0 && (
                      <Badge variant="destructive">Closing Soon</Badge>
                    )}
                      {opp.is_expired && (
                        <Badge variant="secondary">Expired</Badge>
                      )}
                  </div>

                  <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                    {opp.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {opp.company}
                    </span>
                      {opp.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {opp.location}
                    </span>
                      )}
                      {opp.days_until_deadline !== undefined && (
                        <span className={`flex items-center gap-1 ${typeof opp.days_until_deadline === 'number' && opp.days_until_deadline <= 7 && opp.days_until_deadline > 0 ? 'text-destructive' : ''}`}>
                          <Clock className="h-4 w-4" />
                          {typeof opp.days_until_deadline !== 'number'
                            ? 'N/A'
                            : opp.days_until_deadline > 0
                            ? `${opp.days_until_deadline} days left`
                            : 'Expired'}
                        </span>
                      )}
                  </div>

                  <p className="text-muted-foreground mt-3 line-clamp-2">
                    {opp.description}
                  </p>

                    {opp.benefits && opp.benefits.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                        {opp.benefits.slice(0, 3).map((benefit, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {benefit}
                      </Badge>
                    ))}
                        {opp.benefits.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{opp.benefits.length - 3} more
                          </Badge>
                        )}
                  </div>
                    )}

                    {opp.requirements && opp.requirements.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-2">Requirements:</p>
                    <div className="flex flex-wrap gap-2">
                          {opp.requirements.slice(0, 3).map((req, index) => (
                            <span key={index} className="text-xs bg-muted px-2 py-1 rounded">
                          {req}
                        </span>
                      ))}
                          {opp.requirements.length > 3 && (
                            <span className="text-xs bg-muted px-2 py-1 rounded">
                              +{opp.requirements.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex flex-col gap-2">
                    <div className="flex gap-2">
                      {opp.application_url ? (
                        <Button className="flex-1 gap-2" onClick={() => window.open(opp.application_url, '_blank')}>
                          Apply Now
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button className="flex-1 gap-2" disabled>
                          Application Closed
                        </Button>
                      )}
                      <SocialShare
                        title={opp.title}
                        description={`${opp.company} - ${opp.type} opportunity`}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      {opp.views_count} views
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Empty State */}
        {!loading && !error && opportunities.length === 0 && (
          <div className="text-center py-16">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No opportunities found</h3>
            <p className="text-muted-foreground">
              {searchQuery || activeCategory !== 'all'
                ? 'Try adjusting your search or category filters.'
                : 'Check back later for new opportunities.'
              }
            </p>
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <Button
              variant="outline"
              disabled={pagination.page <= 1}
              onClick={() => fetchPage(pagination.page - 1)}
            >
              Previous
            </Button>

            <span className="text-sm text-muted-foreground px-4">
              Page {pagination.page} of {pagination.pages}
            </span>

            <Button
              variant="outline"
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchPage(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Opportunities;
