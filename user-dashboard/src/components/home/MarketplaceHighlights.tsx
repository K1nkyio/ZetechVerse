import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, DollarSign, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { marketplaceApi, type MarketplaceListing } from '@/api/marketplace.api';
import { applyImageFallback, normalizeImageUrl } from '@/lib/image';

const MarketplaceHighlights = () => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLatestListings = async () => {
      try {
        setLoading(true);
        setError(null);
        // Get the latest marketplace listings
        const response = await marketplaceApi.getListings({
          limit: 4,
          sort_by: 'created_at',
          sort_order: 'DESC'
        });
        const items = response?.listings || [];
        setListings(items);
      } catch (err: any) {
        console.error('Failed to fetch marketplace listings:', err);
        setListings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestListings();
  }, []);
  return (
    <section className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold">Marketplace</h2>
            <p className="text-muted-foreground mt-2">Buy, sell, and trade with fellow students. Find textbooks, electronics, furniture, and more.</p>
          </div>
          <Button variant="ghost" asChild className="gap-2 w-full sm:w-auto">
            <Link to="/marketplace">
              Browse All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {loading ? (
            // Loading skeletons
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-card rounded-2xl border border-border overflow-hidden">
                <Skeleton className="aspect-square w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))
          ) : (listings || []).length === 0 ? (
            <div className="sm:col-span-2 lg:col-span-4 text-center py-12">
              <p className="text-muted-foreground">No marketplace listings available.</p>
            </div>
          ) : (
            (listings || []).map((listing) => (
              <Link
                key={listing.id}
                to={`/marketplace/${listing.id}`}
                className="group block bg-card rounded-2xl border border-border overflow-hidden hover:border-primary/50 transition-colors"
              >
                <div className="relative aspect-square bg-muted">
                  {listing.image_urls && listing.image_urls.length > 0 ? (
                    <img
                      src={normalizeImageUrl(listing.image_urls[0])}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={applyImageFallback}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No image
                    </div>
                  )}
                  {listing.urgent && (
                    <Badge className="absolute top-3 left-3 bg-destructive">Urgent</Badge>
                  )}
                  <Badge variant="secondary" className="absolute top-3 right-3 capitalize">
                    {listing.condition}
                  </Badge>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors line-clamp-1">
                    {listing.title}
                  </h3>
                  <p className="text-lg font-bold text-primary mb-2">
                    {listing.price.toLocaleString()} KES
                    {listing.is_negotiable && <span className="text-sm font-normal"> (Negotiable)</span>}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {listing.location && (
                      <>
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{listing.location}</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default MarketplaceHighlights;
