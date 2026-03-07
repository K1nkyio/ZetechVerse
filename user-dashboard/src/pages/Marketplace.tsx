import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/ui/page-header';
import { 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  Smartphone,
  Shirt,
  BookOpen,
  Code,
  Home,
  Grid3X3,
  Star,
  CheckCircle,
  MessageCircle,
  Phone,
  Heart,
  ShoppingCart,
  Share2,
  ArrowUpDown,
  SlidersHorizontal,
  X,
  Package,
  Bookmark,
  History
} from 'lucide-react';
import { marketplaceApi } from '@/api/marketplace.api';
import { useCartWishlistContext } from '@/contexts/cart-wishlist-context';
import { getStored, setStored, upsertRecent } from '@/lib/storage';
import { trackEvent } from '@/lib/analytics';
import { applyImageFallback, normalizeImageUrl } from '@/lib/image';





const categories = [
  { id: 'all', name: 'All', icon: Grid3X3 },
  { id: 'electronics', name: 'Electronics', icon: Smartphone },
  { id: 'fashion', name: 'Fashion', icon: Shirt },
  { id: 'books', name: 'Books', icon: BookOpen },
  { id: 'services', name: 'Services', icon: Code },
  { id: 'hostels', name: 'Hostels', icon: Home },
];

const conditions = [
  { id: 'new', label: 'New' },
  { id: 'used', label: 'Used' },
  { id: 'refurbished', label: 'Refurbished' },
];

const campusLocations = [
  'Main Campus',
  'Engineering Block',
  'Business School',
  'Library Area',
  'Hostel A',
  'Hostel B',
  'Hostel C',
  'Gate A Area',
  'Gate B Area',
  'Cafeteria',
  'Sports Complex'
];

const sortOptions = [
  { id: 'newest', label: 'Newest First', icon: Clock },
  { id: 'oldest', label: 'Oldest First', icon: Clock },
  { id: 'price-low', label: 'Price: Low to High', icon: ArrowUpDown },
  { id: 'price-high', label: 'Price: High to Low', icon: ArrowUpDown },
  { id: 'relevance', label: 'Most Relevant', icon: Search },
  { id: 'distance', label: 'Nearest to You', icon: MapPin }
];

const getEffectiveListingKind = (listing: any): 'product' | 'service' | 'hostel' => {
  const rawKind = String(listing?.listing_kind || '').toLowerCase();
  if (rawKind === 'service' || rawKind === 'hostel') {
    return rawKind;
  }

  const serviceDetails = listing?.service_details;
  const hostelDetails = listing?.hostel_details;
  const hasServiceDetails = Boolean(
    serviceDetails &&
    (
      serviceDetails.pricing_model ||
      (typeof serviceDetails.service_area === 'string' && serviceDetails.service_area.trim()) ||
      (typeof serviceDetails.availability === 'string' && serviceDetails.availability.trim())
    )
  );
  const hasHostelDetails = Boolean(
    hostelDetails &&
    (
      hostelDetails.room_type ||
      Number(hostelDetails.beds_available || 0) > 0 ||
      hostelDetails.gender_policy ||
      (Array.isArray(hostelDetails.amenities) && hostelDetails.amenities.length > 0)
    )
  );

  if (hasHostelDetails) return 'hostel';
  if (hasServiceDetails) return 'service';

  const categoryText = `${listing?.category_name || ''} ${listing?.category_slug || ''}`.toLowerCase();
  if (categoryText.includes('hostel')) return 'hostel';
  if (categoryText.includes('service')) return 'service';

  return 'product';
};

const Marketplace = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(getStored<string>('zv:market:search', ''));
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeCategory = searchParams.get('category') || 'all';
  const isServiceOrHostelCategory = activeCategory === 'services' || activeCategory === 'hostels';
  const { toast } = useToast();

  // Enhanced filtering state
  const [selectedConditions, setSelectedConditions] = useState<string[]>(() => getStored<string[]>('zv:market:conditions', []));
  const [selectedLocations, setSelectedLocations] = useState<string[]>(() => getStored<string[]>('zv:market:locations', []));
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [sortBy, setSortBy] = useState(getStored<string>('zv:market:sort', 'newest'));
  const [showFilters, setShowFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState(50000);
  const [priceInitialized, setPriceInitialized] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getStored<string[]>('zv:market:recent', []));
  const [savedSearches, setSavedSearches] = useState<string[]>(() => getStored<string[]>('zv:market:saved', []));
  const { addToCart, toggleWishlist, isInWishlist } = useCartWishlistContext();

  // Helper function to handle price range changes
  const handlePriceRangeChange = (value: number[]) => {
    setPriceRange([value[0], value[1]] as [number, number]);
  };

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    setStored('zv:market:search', searchQuery);
    setStored('zv:market:conditions', selectedConditions);
    setStored('zv:market:locations', selectedLocations);
    setStored('zv:market:sort', sortBy);
  }, [searchQuery, selectedConditions, selectedLocations, sortBy]);

  useEffect(() => {
    if (isServiceOrHostelCategory && selectedConditions.length > 0) {
      setSelectedConditions([]);
    }
  }, [isServiceOrHostelCategory, selectedConditions]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await marketplaceApi.getListings({ 
        status: 'active',
        limit: 100 
      });
      setListings(response.listings);
      // Dynamically set max price from fetched listings to avoid filtering out items by default
      const prices = Array.isArray(response.listings)
        ? response.listings.map((l: any) => (typeof l.price === 'number' ? l.price : 0))
        : [];
      const computedMax = Math.max(50000, ...(prices.length ? prices : [0]));
      setMaxPrice(computedMax);
      if (!priceInitialized) {
        setPriceRange([0, computedMax] as [number, number]);
        setPriceInitialized(true);
      }
    } catch (err: any) {
      console.error('Failed to fetch listings:', err);
      setError('Failed to load listings');
      toast({
        title: 'Error',
        description: 'Failed to load marketplace listings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Enhanced filtering logic
  const filteredListings = listings.filter((listing: any) => {
    // Safe null checks for all listing properties
    const listingCategoryName = listing.category_name || '';
    const listingCategorySlug = listing.category_slug || (listingCategoryName ? listingCategoryName.toLowerCase().replace(/\s+/g, '-') : '');
    const listingKind = getEffectiveListingKind(listing);
    const listingCondition = listing.condition || '';
    const listingLocation = listing.location || '';
    const listingTitle = listing.title || '';
    const listingDescription = listing.description || '';
    const listingTags = Array.isArray(listing.tags) ? listing.tags : [];
    const listingPrice = typeof listing.price === 'number' ? listing.price : 0;
    
    const normalizedActiveCategory = activeCategory.toLowerCase();
    const matchesCategory = (() => {
      if (normalizedActiveCategory === 'all') return true;
      if (normalizedActiveCategory === 'services') {
        return listingKind === 'service' || listingCategoryName.toLowerCase().includes('service') || listingCategorySlug.toLowerCase().includes('service');
      }
      if (normalizedActiveCategory === 'hostels') {
        return listingKind === 'hostel' || listingCategoryName.toLowerCase().includes('hostel') || listingCategorySlug.toLowerCase().includes('hostel');
      }

      return (
        (listingKind === 'product' || !listing.listing_kind) &&
        (listingCategoryName.toLowerCase() === normalizedActiveCategory || listingCategorySlug.toLowerCase() === normalizedActiveCategory)
      );
    })();
    const matchesSearch = !searchQuery ||
      listingTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listingDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listingTags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const shouldApplyConditionFilter = selectedConditions.length > 0 && !isServiceOrHostelCategory;
    const matchesCondition = !shouldApplyConditionFilter ||
      (listingKind === 'product' && selectedConditions.includes(listingCondition));

    const matchesLocation = selectedLocations.length === 0 ||
      selectedLocations.some(loc => listingLocation.toLowerCase().includes(loc.toLowerCase()));

    const matchesPrice = listingPrice >= priceRange[0] && listingPrice <= priceRange[1];

    return matchesCategory && matchesSearch && matchesCondition && matchesLocation && matchesPrice;
  });

  // Sorting logic
  const sortedListings = [...filteredListings].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      case 'oldest':
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'relevance':
        {
          // Simple relevance scoring based on search match quality
          const score = (listing: any) => {
            if (!searchQuery) return 0;

            let currentScore = 0;
            const query = searchQuery.toLowerCase();

            if (String(listing.title || '').toLowerCase().includes(query)) currentScore += 3;
            if (String(listing.description || '').toLowerCase().includes(query)) currentScore += 2;
            if (Array.isArray(listing.tags) && listing.tags.some((tag: string) => tag.toLowerCase().includes(query))) {
              currentScore += 1;
            }
            return currentScore;
          };

          return score(b) - score(a);
        }
      case 'distance':
        {
          // For now, prioritize campus locations, but this could be enhanced with GPS
          const campusPriority = ['Main Campus', 'Engineering Block', 'Library Area', 'Business School'];
          const aPriority = campusPriority.includes(a.location) ? 1 : 0;
          const bPriority = campusPriority.includes(b.location) ? 1 : 0;
          if (aPriority !== bPriority) return bPriority - aPriority;
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        }
      default:
        return 0;
    }
  });

  // Log the raw listings and filtered listings for debugging
  useEffect(() => {
    console.log(`Total listings from API: ${listings.length}`);
    console.log(`Filtered listings: ${filteredListings.length}`);
    console.log(`Active category: ${activeCategory}`);
    console.log(`Selected conditions: ${JSON.stringify(selectedConditions)}`);
    console.log(`Selected locations: ${JSON.stringify(selectedLocations)}`);
    console.log(`Search query: "${searchQuery}"`);
    console.log(`Price range: [${priceRange[0]}, ${priceRange[1]}]`);
  }, [listings, filteredListings, activeCategory, selectedConditions, selectedLocations, searchQuery, priceRange]);

  const handleCategoryChange = (category: string) => {
    const next = new URLSearchParams(searchParams);
    if (category === 'all') {
      next.delete('category');
    } else {
      next.set('category', category);
    }
    setSearchParams(next);
    if (category === 'services' || category === 'hostels') {
      setSelectedConditions([]);
    }
    trackEvent('marketplace_filter_category', { category });
  };

  const handleConditionChange = (condition: string, checked: boolean) => {
    if (checked) {
      setSelectedConditions(prev => [...prev, condition]);
    } else {
      setSelectedConditions(prev => prev.filter(c => c !== condition));
    }
  };

  const handleLocationChange = (location: string, checked: boolean) => {
    if (checked) {
      setSelectedLocations(prev => [...prev, location]);
    } else {
      setSelectedLocations(prev => prev.filter(l => l !== location));
    }
  };

  const clearAllFilters = () => {
    setSelectedConditions([]);
    setSelectedLocations([]);
    setPriceRange([0, maxPrice]);
    setSearchQuery('');
    setSortBy('newest');
  };

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      setRecentSearches(upsertRecent('zv:market:recent', value.trim(), 8));
    }
  };

  const toSavedItem = (listing: any) => ({
    id: Number(listing.id),
    title: listing.title,
    price: listing.price,
    image_url: normalizeImageUrl(listing.image_urls?.[0]),
    location: listing.location
  });

  const handleWishlistToggle = (listing: any) => {
    const added = toggleWishlist(toSavedItem(listing));
    toast({ title: added ? 'Added to wishlist' : 'Removed from wishlist' });
  };

  const handleAddToCart = (listing: any) => {
    addToCart(toSavedItem(listing));
    toast({ title: 'Added to cart', description: 'Proceeding to checkout/payment.' });
    navigate('/checkout');
  };

  const activeConditionCount = isServiceOrHostelCategory ? 0 : selectedConditions.length;
  const activeFiltersCount = activeConditionCount + selectedLocations.length +
    (priceRange[0] > 0 || priceRange[1] < maxPrice ? 1 : 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <PageHeader
          title="Campus Marketplace"
          titleClassName="whitespace-nowrap text-2xl sm:text-3xl md:text-4xl"
          centered
          icon={<ShoppingCart className="h-6 w-6 text-primary" aria-hidden="true" />}
          description="Buy, sell, and trade with fellow Zetech students. Find great deals on electronics, books, fashion, services, and accommodation."
        />

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

        {/* Search and Controls */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by title, description, or tags..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              aria-label="Search marketplace listings"
            />
          </div>

          {/* Desktop Filters */}
          <div className="hidden lg:flex gap-2">
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2 relative">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-96">
                <SheetHeader>
                  <SheetTitle>Filter Listings</SheetTitle>
                </SheetHeader>

                <div className="space-y-6 mt-6">
                  {/* Price Range */}
                  <div>
                    <h4 className="font-medium mb-3">Price Range (KES)</h4>
                    <div className="px-2">
                      <Slider
                        value={priceRange}
                        onValueChange={handlePriceRangeChange}
                        max={maxPrice}
                        min={0}
                        step={500}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground mt-2">
                        <span>KES {priceRange[0].toLocaleString()}</span>
                        <span>KES {priceRange[1].toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Condition */}
                  {!isServiceOrHostelCategory && (
                    <div>
                      <h4 className="font-medium mb-3">Condition</h4>
                      <div className="space-y-2">
                        {conditions.map((condition) => (
                          <div key={condition.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={condition.id}
                              checked={selectedConditions.includes(condition.id)}
                              onCheckedChange={(checked) =>
                                handleConditionChange(condition.id, checked as boolean)
                              }
                            />
                            <label htmlFor={condition.id} className="text-sm">
                              {condition.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  <div>
                    <h4 className="font-medium mb-3">Campus Location</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {campusLocations.map((location) => (
                        <div key={location} className="flex items-center space-x-2">
                          <Checkbox
                            id={location}
                            checked={selectedLocations.includes(location)}
                            onCheckedChange={(checked) =>
                              handleLocationChange(location, checked as boolean)
                            }
                          />
                          <label htmlFor={location} className="text-sm">
                            {location}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Clear Filters */}
                  <Button
                    variant="outline"
                    onClick={clearAllFilters}
                    className="w-full"
                  >
                    Clear All Filters
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.id} value={option.id}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {option.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Mobile Filters Toggle */}
          <div className="lg:hidden flex gap-2">
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2 relative">
                  <SlidersHorizontal className="h-4 w-4" />
            Filters
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh]">
                <SheetHeader>
                  <SheetTitle>Filter Listings</SheetTitle>
                </SheetHeader>

                <div className="space-y-6 mt-6 overflow-y-auto">
                  {/* Price Range */}
                  <div>
                    <h4 className="font-medium mb-3">Price Range (KES)</h4>
                    <div className="px-2">
                      <Slider
                        value={priceRange}
                        onValueChange={handlePriceRangeChange}
                        max={maxPrice}
                        min={0}
                        step={500}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground mt-2">
                        <span>KES {priceRange[0].toLocaleString()}</span>
                        <span>KES {priceRange[1].toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Condition */}
                  {!isServiceOrHostelCategory && (
                    <div>
                      <h4 className="font-medium mb-3">Condition</h4>
                      <div className="space-y-2">
                        {conditions.map((condition) => (
                          <div key={condition.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={condition.id}
                              checked={selectedConditions.includes(condition.id)}
                              onCheckedChange={(checked) =>
                                handleConditionChange(condition.id, checked as boolean)
                              }
                            />
                            <label htmlFor={condition.id} className="text-sm">
                              {condition.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  <div>
                    <h4 className="font-medium mb-3">Campus Location</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {campusLocations.map((location) => (
                        <div key={location} className="flex items-center space-x-2">
                          <Checkbox
                            id={location}
                            checked={selectedLocations.includes(location)}
                            onCheckedChange={(checked) =>
                              handleLocationChange(location, checked as boolean)
                            }
                          />
                          <label htmlFor={location} className="text-sm">
                            {location}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Clear Filters */}
                  <Button
                    variant="outline"
                    onClick={clearAllFilters}
                    className="w-full"
                  >
                    Clear All Filters
          </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

        </div>

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

        {/* Results Count and Active Filters */}
        {!loading && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <p className="text-muted-foreground">
              Showing {sortedListings.length} listings
              {activeFiltersCount > 0 && (
                <span className="ml-2">
                  ({activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} applied)
                </span>
              )}
            </p>

            {/* Active Filters Display */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap gap-2">
                {!isServiceOrHostelCategory && selectedConditions.map((condition) => (
                  <Badge key={condition} variant="secondary" className="gap-1">
                    {conditions.find(c => c.id === condition)?.label}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleConditionChange(condition, false)}
                    />
                  </Badge>
                ))}
                {selectedLocations.map((location) => (
                  <Badge key={location} variant="secondary" className="gap-1">
                    {location}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleLocationChange(location, false)}
                    />
                  </Badge>
                ))}
                {(priceRange[0] > 0 || priceRange[1] < maxPrice) && (
                  <Badge variant="secondary" className="gap-1">
                    KES {priceRange[0].toLocaleString()} - {priceRange[1].toLocaleString()}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setPriceRange([0, maxPrice])}
                    />
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-6 px-2 text-xs"
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 py-4">
            {Array.from({ length: 10 }).map((_, idx) => (
              <div key={idx} className="rounded-xl border border-border overflow-hidden">
                <Skeleton className="aspect-square w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-16">
            <p className="text-destructive">{error}</p>
            <Button onClick={fetchListings} className="mt-4">
              Try Again
            </Button>
          </div>
        )}

        {/* Enhanced Listings Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
            {sortedListings.map((listing: any) => {
              const listingKind = getEffectiveListingKind(listing);
              return (
                <div
                  key={listing.id}
                  className="group block bg-card rounded-xl sm:rounded-2xl border border-border overflow-hidden hover:border-primary/50 hover:shadow-xl transition-all duration-300"
                >
                  <Link to={`/marketplace/${listing.id}`}>
                  {/* Image Section */}
                  <div className="relative aspect-square bg-muted overflow-hidden">
                  {listing.image_urls && listing.image_urls.length > 0 ? (
                      <>
                    <img
                      src={normalizeImageUrl(listing.image_urls[0])}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={applyImageFallback}
                        />
                        {/* Multiple images indicator */}
                        {listing.image_urls.length > 1 && (
                          <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 bg-black/60 text-white text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                            {listing.image_urls.length} photos
                          </div>
                        )}
                      </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Grid3X3 className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-muted-foreground/50" />
                    </div>
                  )}

                    {/* Condition Badge */}
                    <Badge
                      variant={listingKind === 'product' && listing.condition === 'new' ? 'default' : 'secondary'}
                      className="absolute top-2 sm:top-3 left-2 sm:left-3 capitalize text-xs"
                    >
                      {listingKind === 'product'
                        ? (listing.condition?.replace('-', ' ') || 'Available')
                        : listingKind}
                  </Badge>
                    {listing.status && String(listing.status).toLowerCase() !== 'active' && (
                      <Badge
                        variant={listing.status === 'active' ? 'outline' : listing.status === 'sold' ? 'destructive' : 'secondary'}
                        className="absolute top-2 sm:top-3 left-20 sm:left-24 capitalize text-xs"
                      >
                        {listing.status}
                      </Badge>
                    )}

                    {/* Wishlist Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`absolute top-2 sm:top-3 right-2 sm:right-3 h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-white/90 hover:bg-white ${
                        isInWishlist(Number(listing.id)) ? 'text-red-500' : 'text-muted-foreground'
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleWishlistToggle(listing);
                      }}
                    >
                      <Heart className={`h-3 w-3 sm:h-4 sm:w-4 ${isInWishlist(Number(listing.id)) ? 'fill-current' : ''}`} />
                    </Button>
                </div>

                  {/* Content Section */}
                <div className="p-3 sm:p-4">
                    {/* Title and Price */}
                    <div className="mb-2 sm:mb-3">
                      <h3 className="font-semibold line-clamp-2 text-xs sm:text-sm leading-tight group-hover:text-primary transition-colors mb-1 sm:mb-2">
                    {listing.title}
                  </h3>
                      <p className="text-sm sm:text-lg font-bold text-primary">
                        KES {typeof listing.price === 'number' ? listing.price.toLocaleString() : listing.price}
                      </p>
                      {listing.is_negotiable && (
                        <p className="text-xs text-muted-foreground">Negotiable</p>
                      )}
                    </div>

                    {/* Seller Info */}
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                      <div className="flex items-center gap-1">
                        <span className="text-xs sm:text-sm font-medium truncate">
                          {listing.seller_full_name || listing.seller_username || 'Seller'}
                        </span>
                        {/* Rating information is not always available in the API response */}
                        {listing.seller_rating && (
                          <>
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs text-muted-foreground">
                                {listing.seller_rating} ({listing.seller_reviews || 0})
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Location and Time */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 sm:mb-3">
                    {listing.location && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{listing.location}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                        {listing.created_at ? (() => {
                          const date = new Date(listing.created_at);
                          const now = new Date();
                          const diffTime = Math.abs(now.getTime() - date.getTime());
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                          if (diffDays === 1) return '1d ago';
                          if (diffDays < 7) return `${diffDays}d ago`;
                          if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
                          return date.toLocaleDateString();
                        })() : 'Recently'}
                    </span>
                    </div>

                    {/* Tags */}
                    {listing.tags && listing.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {listing.tags.slice(0, 3).map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                        {listing.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{listing.tags.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Handle quick message - could open a modal or navigate
                          toast({
                            title: 'Quick Contact',
                            description: 'Contact feature coming soon!',
                          });
                        }}
                      >
                        <MessageCircle className="h-3 w-3 mr-1" />
                        Message
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAddToCart(listing);
                        }}
                        title="Add to cart"
                      >
                        <ShoppingCart className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Handle share
                          if (navigator.share) {
                            navigator.share({
                              title: listing.title,
                              text: `Check out this listing: ${listing.title}`,
                              url: `${window.location.origin}/marketplace/${listing.id}`,
                            });
                          } else {
                            navigator.clipboard.writeText(`${window.location.origin}/marketplace/${listing.id}`);
                            toast({ title: 'Link copied!' });
                          }
                        }}
                      >
                        <Share2 className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Urgent Badge */}
                    {listing.urgent && (
                      <Badge variant="destructive" className="mt-2 text-xs">
                        Urgent Sale
                      </Badge>
                    )}
                  </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}





        {!loading && !error && sortedListings.length === 0 && (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <Grid3X3 className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No listings found</h3>
              <p className="text-muted-foreground mb-6">
                {activeFiltersCount > 0
                  ? "Try adjusting your filters or search terms to find more listings."
                  : "Be the first to post something! Campus students are looking for textbooks, electronics, and more."
                }
              </p>
              {activeFiltersCount > 0 && (
                <Button variant="outline" onClick={clearAllFilters} className="mr-2">
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Marketplace;
