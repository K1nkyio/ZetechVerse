import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, MapPin, Clock, Briefcase, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { opportunitiesApi, type Opportunity } from '@/api/opportunities.api';

const OpportunitiesPreview = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeaturedOpportunities = async () => {
      try {
        setLoading(true);
        setError(null);
        // Get featured opportunities instead of just latest ones
        const response = await opportunitiesApi.getFeaturedOpportunities(3);
        const items = response?.opportunities || [];
        setOpportunities(items);
      } catch (err: any) {
        console.error('Failed to fetch featured opportunities:', err);
        setOpportunities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedOpportunities();
  }, []);

  return (
    <section className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold">Latest Opportunities</h2>
            <p className="text-muted-foreground mt-2">Discover internships, jobs, and attachments tailored for Zetech students</p>
          </div>
          <Button variant="ghost" asChild className="gap-2 w-full sm:w-auto">
            <Link to="/opportunities">
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {loading ? (
            // Loading skeletons
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="p-6 bg-card rounded-2xl border border-border">
                <div className="flex items-start justify-between mb-4">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <Skeleton className="w-16 h-6" />
                </div>
                <Skeleton className="h-6 w-3/4 mb-4" />
                <div className="space-y-2 mb-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            ))
          ) : (opportunities || []).length === 0 ? (
            <div className="md:col-span-3 text-center py-12">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No opportunities available right now.</p>
            </div>
          ) : (
            (opportunities || []).map((opp) => (
            <Link
              key={opp.id}
              to={`/opportunities/${opp.id}`}
              className="group block p-6 bg-card rounded-2xl border border-border hover:border-primary/50 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                  <Badge variant="outline" className="capitalize">{opp.type}</Badge>
              </div>

                <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
                {opp.title}
              </h3>

              <div className="space-y-2 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                    <span className="truncate">{opp.company}</span>
                </div>
                  {opp.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                      <span className="truncate">{opp.location}</span>
                </div>
                  )}
                  {opp.days_until_deadline !== undefined && (
                    <div className={`flex items-center gap-2 ${opp.days_until_deadline <= 7 && opp.days_until_deadline > 0 ? 'text-destructive' : ''}`}>
                  <Clock className="h-4 w-4" />
                      {opp.days_until_deadline > 0 ? `${opp.days_until_deadline} days left` : 'Expired'}
                </div>
                  )}
              </div>

                {opp.benefits && opp.benefits.length > 0 && (
              <div className="flex flex-wrap gap-2">
                    {opp.benefits.slice(0, 2).map((benefit, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {benefit}
                  </Badge>
                ))}
                    {opp.benefits.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{opp.benefits.length - 2}
                      </Badge>
                    )}
              </div>
                )}
            </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default OpportunitiesPreview;
