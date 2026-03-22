import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { MessageDialog } from '@/components/MessageDialog';
import { CommentList } from '@/components/marketplace';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Phone,
  Heart,
  Share2,
  Flag,
  Loader,
  AlertCircle,
  CheckCircle,
  Eye,
  Calendar,
  Zap,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  Clock3,
  Package,
  MessageSquare,
  ShoppingCart,
  Star
} from 'lucide-react';
import { apiClient } from '@/api/base';
import { marketplaceApi } from '@/api/marketplace.api';
import { useAuthContext } from '@/contexts/auth-context';
import { useCartWishlistContext } from '@/contexts/cart-wishlist-context';
import { trackEvent } from '@/lib/analytics';
import { applyImageFallback, normalizeImageUrl } from '@/lib/image';
import {
  getEffectiveListingKind,
  normalizeHostelDetails,
  normalizeServiceDetails,
} from '@/lib/marketplace';

const MarketplaceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false);
  const [reserveMessage, setReserveMessage] = useState('');
  const [isReserving, setIsReserving] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showSafetyGuidance, setShowSafetyGuidance] = useState(true);
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  const { toast } = useToast();
  const { addToCart, toggleWishlist, isInWishlist } = useCartWishlistContext();
  const listingKind = getEffectiveListingKind(item);
  const serviceDetails = normalizeServiceDetails(item?.service_details ?? item);
  const hostelDetails = normalizeHostelDetails(item?.hostel_details ?? item);
  const pricingModelLabelMap: Record<string, string> = {
    per_hour: 'Per Hour',
    per_task_assignment: 'Per Task / Assignment',
    subscription_package: 'Subscription / Package',
    pay_per_consultation_meeting: 'Pay Per Consultation / Meeting',
    freemium_addons: 'Freemium + Add-ons',
    tiered_pricing: 'Tiered Pricing',
    pay_what_you_want: 'Pay What You Want',
    commission_performance_based: 'Commission / Performance-Based',
    group_bulk_rate: 'Group / Bulk Rate',
    one_time_flat_fee: 'One-Time Flat Fee',
    sliding_scale_income_based: 'Sliding Scale / Income-Based',
    retainer_monthly_contract: 'Retainer / Monthly Contract',
    hybrid_hourly_task: 'Hybrid (Hourly + Task)',
    trial_paid_upgrade: 'Trial + Paid Upgrade',
    credit_token_system: 'Credit / Token System'
  };

  const requireAuth = (actionText: string) => {
    const token = apiClient.getToken();
    if (!token) {
      toast({
        title: 'Login Required',
        description: `Please log in to ${actionText}.`,
        variant: 'destructive',
      });
      navigate('/login', { state: { from: location } });
      return false;
    }
    return true;
  };

  const handleMessageClick = () => {
    const token = apiClient.getToken();
    if (!token) {
      toast({
        title: 'Login Required',
        description: 'Please log in to message the seller',
        variant: 'destructive',
      });
      navigate('/login', { state: { from: location } });
      return;
    }
    setMessageDialogOpen(true);
  };

  const toSavedItem = (listing: any) => ({
    id: Number(listing.id),
    title: listing.title,
    price: listing.price,
    image_url: normalizeImageUrl(listing.image_urls?.[0] || listing.image),
    location: listing.location
  });

  const handleAddToCart = () => {
    if (!item) return;
    addToCart(toSavedItem(item));
    toast({
      title: 'Added to cart',
      description: 'Proceeding to checkout/payment.'
    });
    navigate('/checkout');
  };

  const handleWishlistToggle = () => {
    if (!item) return;
    const added = toggleWishlist(toSavedItem(item));
    toast({
      title: added ? 'Added to wishlist' : 'Removed from wishlist',
      description: item.title
    });
  };

  useEffect(() => {
    if (id) {
      fetchListing();
    }
  }, [id]);

  useEffect(() => {
    if (item) {
      addToRecentlyViewed(item);
      void loadSimilarProducts();
      void loadRecentlyViewed();
    }
  }, [item]);

  const fetchListing = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await marketplaceApi.getListingById(id!);
      if (response) {
        setItem(response);
        setIsLiked(!!response.likedByMe);
      }
    } catch (err: any) {
      console.error('Failed to fetch listing:', err);
      setError('Failed to load listing details. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to load listing details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/marketplace/${item.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: `Check out this listing: ${item.title}`,
          url: url,
        });
      } catch (error) {
        // User cancelled share or error occurred
        copyToClipboard(url);
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Link copied!',
        description: 'Listing link copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Share',
        description: `Share this link: ${text}`,
      });
    }
  };

  const handleReportListing = async () => {
    if (!item) return;
    if (!requireAuth('report listings')) return;

    if (!reportReason.trim()) {
      toast({
        title: 'Reason required',
        description: 'Please include a reason for this report.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await marketplaceApi.reportListing(String(item.id), {
        reason: reportReason,
        details: reportDetails || undefined,
        risk_level: /scam|fraud|danger|unsafe/i.test(`${reportReason} ${reportDetails}`) ? 'high' : 'medium',
      });
      trackEvent('marketplace_listing_reported', {
        listingId: item.id,
        reason: reportReason,
      });
      toast({
        title: 'Report submitted',
        description: 'Moderators will review this listing.',
      });
      setReportDialogOpen(false);
      setReportReason('');
      setReportDetails('');
    } catch (error: any) {
      toast({
        title: 'Report failed',
        description: error.message || 'Could not submit this report.',
        variant: 'destructive',
      });
    }
  };

  // Image gallery functions
  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  const nextImage = () => {
    if (item?.image_urls) {
      setCurrentImageIndex((prev) => (prev + 1) % item.image_urls.length);
    }
  };

  const prevImage = () => {
    if (item?.image_urls) {
      setCurrentImageIndex((prev) => (prev - 1 + item.image_urls.length) % item.image_urls.length);
    }
  };

  // Like functionality
  const handleLike = async () => {
    if (!item) return;
    if (!requireAuth('like listings')) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast({
        title: 'Offline',
        description: 'You appear to be offline. Please reconnect and try again.',
        variant: 'destructive',
      });
      return;
    }

    if (likeBusy) return;

    const previousLikes = item.likes_count || 0;
    const optimisticLiked = !isLiked;

    try {
      setLikeBusy(true);
      setIsLiked(optimisticLiked);
      setItem((prev: any) =>
        prev
          ? {
              ...prev,
              likes_count: optimisticLiked ? previousLikes + 1 : Math.max(0, previousLikes - 1),
            }
          : prev
      );

      const response = await marketplaceApi.toggleLike(String(item.id));
      setIsLiked(response.liked);
      setItem((prev: any) => (prev ? { ...prev, likes_count: response.likes_count } : prev));

      toast({
        title: response.liked ? 'Liked!' : 'Unliked!',
        description: response.liked ? 'Added your like to this listing' : 'Removed your like from this listing',
      });
    } catch (error: any) {
      console.error('Failed to like listing:', error);
      setIsLiked((prev) => !prev);
      setItem((prev: any) => (prev ? { ...prev, likes_count: previousLikes } : prev));
      toast({
        title: 'Error',
        description: error.message || 'Could not update like status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLikeBusy(false);
    }
  };

  // Reserve functionality
  const handleReserve = async () => {
    if (!item) return;
    if (!requireAuth('reserve items')) return;

    if (!reserveMessage.trim()) {
      toast({
        title: 'Message required',
        description: 'Please provide a message for the seller',
        variant: 'destructive',
      });
      return;
    }

    setIsReserving(true);
    try {
      const reservation = await marketplaceApi.reserveListing(String(item.id), reserveMessage.trim());
      setItem((prev: any) =>
        prev
          ? {
              ...prev,
              reserved_by: reservation.reserved_by,
              reserved_at: reservation.reserved_at,
              reserved_until: reservation.reserved_until,
              reservation_message: reserveMessage.trim(),
              reservation: {
                is_reserved: true,
                reserved_by: reservation.reserved_by,
                reserved_at: reservation.reserved_at,
                reserved_until: reservation.reserved_until,
                reservation_message: reserveMessage.trim(),
              },
            }
          : prev
      );

      toast({
        title: 'Item Reserved!',
        description: 'The seller will be notified. Item is held for 24 hours.',
      });
      setReserveDialogOpen(false);
      setReserveMessage('');
    } catch (error) {
      toast({
        title: 'Reservation failed',
        description: 'Please try again or contact the seller directly',
        variant: 'destructive',
      });
    } finally {
      setIsReserving(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!item) return;
    if (!requireAuth('review sellers')) return;

    try {
      setSubmittingReview(true);
      const sellerProfile = await marketplaceApi.submitSellerReview(String(item.id), {
        rating: reviewRating,
        review_text: reviewText.trim() || undefined,
      });

      setItem((prev: any) => (prev ? { ...prev, seller_profile: sellerProfile } : prev));
      setReviewText('');
      toast({
        title: 'Review saved',
        description: 'Your seller rating has been recorded.',
      });
      await fetchListing();
    } catch (error: any) {
      toast({
        title: 'Review failed',
        description: error.message || 'Could not save your review.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReleaseReservation = async () => {
    if (!item) return;

    try {
      await marketplaceApi.releaseReservation(String(item.id));
      setItem((prev: any) =>
        prev
          ? {
              ...prev,
              reserved_by: null,
              reserved_at: null,
              reserved_until: null,
              reservation_message: null,
              reservation: {
                is_reserved: false,
                reserved_by: null,
                reserved_at: null,
                reserved_until: null,
                reservation_message: null,
              },
            }
          : prev
      );
      toast({
        title: 'Reservation released',
        description: 'The item is available again.',
      });
    } catch (error: any) {
      toast({
        title: 'Could not release reservation',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Add to recently viewed
  const addToRecentlyViewed = (product: any) => {
    const viewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    const filtered = viewed.filter((p: any) => p.id !== product.id);
    filtered.unshift({
      ...product,
      viewedAt: new Date().toISOString()
    });
    const limited = filtered.slice(0, 10);
    localStorage.setItem('recentlyViewed', JSON.stringify(limited));
    setRecentlyViewed(limited.filter(p => p.id !== product.id).slice(0, 4));
  };

  // Load recently viewed and prune stale IDs that no longer exist in API data.
  const loadRecentlyViewed = async () => {
    const viewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    if (!Array.isArray(viewed) || viewed.length === 0) {
      setRecentlyViewed([]);
      return;
    }

    try {
      const response = await marketplaceApi.getListings({ status: 'active', limit: 200 });
      const validIds = new Set((response?.listings || []).map((listing: any) => String(listing.id)));
      const cleaned = viewed.filter((p: any) => validIds.has(String(p.id)));

      if (cleaned.length !== viewed.length) {
        localStorage.setItem('recentlyViewed', JSON.stringify(cleaned));
      }

      setRecentlyViewed(cleaned.filter((p: any) => p.id !== item?.id).slice(0, 4));
    } catch {
      // If listings endpoint fails, keep existing behavior without deleting local data.
      setRecentlyViewed(viewed.filter((p: any) => p.id !== item?.id).slice(0, 4));
    }
  };

  // Load similar products from live API data so linked IDs always exist.
  const loadSimilarProducts = async () => {
    if (!item) return;

    try {
      const filters: any = { status: 'active', limit: 20 };
      if (item.category_id) {
        filters.category_id = String(item.category_id);
      }

      const response = await marketplaceApi.getListings(filters);
      const similar = (response?.listings || [])
        .filter((p: any) => String(p.id) !== String(item.id))
        .slice(0, 4);

      setSimilarProducts(similar);
    } catch (error) {
      console.error('Failed to load similar products:', error);
      setSimilarProducts([]);
    }
  };

  if (!item) {
    if (loading) {
      return (
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container mx-auto px-4 py-16">
            <div className="flex items-center justify-center">
              <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
          </main>
          <Footer />
        </div>
      );
    }

    if (error) {
      return (
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container mx-auto px-4 py-16">
            <div className="flex flex-col items-center justify-center gap-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <p className="text-destructive text-lg">{error}</p>
              <Button onClick={() => navigate('/marketplace')} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Marketplace
              </Button>
            </div>
          </main>
          <Footer />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Item Not Found</h1>
          <p className="text-muted-foreground mb-8">The listing you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/marketplace">Back to Marketplace</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/marketplace" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Marketplace
          </Link>
        </Button>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Enhanced Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square bg-muted rounded-lg overflow-hidden group cursor-pointer">
              <img
                src={normalizeImageUrl(item.image_urls?.[0] || item.image)}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onClick={() => openLightbox(0)}
                onError={applyImageFallback}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              {item.image_urls && item.image_urls.length > 1 && (
                <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                  {item.image_urls.length} photos
                </div>
              )}
            </div>

            {/* Thumbnail Grid */}
            {item.image_urls && item.image_urls.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {item.image_urls.map((image: string, index: number) => (
                  <div
                    key={index}
                    className={`aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                      index === 0 ? 'border-primary' : 'border-transparent hover:border-primary/50'
                    }`}
                    onClick={() => openLightbox(index)}
                  >
                     <img
                      src={normalizeImageUrl(image)}
                       alt={`${item.title} ${index + 1}`}
                       className="w-full h-full object-cover"
                       onError={applyImageFallback}
                     />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Enhanced Product Details */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {item.category_name || item.category}
                  </Badge>
                  {listingKind === 'product' && item.condition && (
                    <Badge variant={item.condition === 'new' ? 'default' : 'outline'} className="capitalize">
                      {item.condition.replace('-', ' ')}
                    </Badge>
                  )}
                  {item.status && String(item.status).toLowerCase() !== 'active' && (
                    <Badge
                      variant={item.status === 'active' ? 'secondary' : item.status === 'sold' ? 'destructive' : 'outline'}
                      className="capitalize"
                    >
                      {item.status}
                    </Badge>
                  )}
                  {item.urgent && (
                    <Badge variant="destructive" className="gap-1">
                      <Zap className="h-3 w-3" />
                      Urgent
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLike}
                    disabled={likeBusy}
                    className={isLiked ? 'text-red-500' : ''}
                  >
                    <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {item.likes_count || 0}
                  </span>
                </div>
              </div>

              <h1 className="text-3xl font-bold mb-2">{item.title}</h1>

              <div className="flex items-center gap-3 mb-3">
                <p className="text-3xl font-bold text-primary">
                  {typeof item.price === 'number' ? `KSh ${item.price.toLocaleString()}` : item.price}
                </p>
                {item.is_negotiable && (
                  <Badge variant="outline" className="text-xs">
                    Negotiable
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <Button onClick={handleAddToCart} className="gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Add to cart
                </Button>
                <Button
                  variant={isInWishlist(Number(item.id)) ? 'default' : 'outline'}
                  onClick={handleWishlistToggle}
                  className="gap-2"
                >
                  <Heart className={`h-4 w-4 ${isInWishlist(Number(item.id)) ? 'fill-current' : ''}`} />
                  {isInWishlist(Number(item.id)) ? 'Wishlisted' : 'Add to wishlist'}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{item.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span>{typeof item.views_count === 'number' ? item.views_count : Math.floor(Math.random() * 50) + 10} views</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Posted {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recently'}</span>
                </div>
                {item.updated_at && (
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4" />
                    <span>Updated {new Date(item.updated_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Enhanced Seller Info */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {(item.seller_full_name || item.seller_username || 'S').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{item.seller_full_name || item.seller_username || 'Seller'}</p>
                      {item.seller_profile?.verified_student ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-xs text-green-600 font-medium">{item.seller_profile.badge_label}</span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unverified seller</span>
                      )}
                    </div>
                    {item.seller_profile?.reviews_count ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{item.seller_profile.average_rating}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          ({item.seller_profile.reviews_count} reviews)
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.seller_profile.completed_transactions} completed deals
                        </span>
                      </div>
                    ) : <p className="text-xs text-muted-foreground">No seller reviews yet.</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setReportDialogOpen(true)} aria-label="Report listing">
                    <Flag className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {item.reservation?.is_reserved && (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                  <p className="font-medium">Item reserved</p>
                  <p className="mt-1">
                    Reserved until {item.reservation.reserved_until ? new Date(item.reservation.reserved_until).toLocaleString() : 'soon'}.
                  </p>
                  {(String(item.reservation.reserved_by) === String(user?.id) || String(item.seller_id) === String(user?.id)) && (
                    <Button variant="outline" size="sm" className="mt-3" onClick={handleReleaseReservation}>
                      Release reservation
                    </Button>
                  )}
                </div>
              )}

              <div>
                <Button
                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                  size="lg"
                  onClick={() => {
                    if (item.phone) {
                      // Open WhatsApp directly to seller's DM using the phone number
                      window.open(`https://wa.me/${item.phone.replace(/\D/g, "")}`, "_blank");
                    } else {
                      // Fallback to message dialog if no phone number
                      handleMessageClick();
                    }
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Enquire via WhatsApp
                </Button>
              </div>

              {item.safety_guidance?.length > 0 && (
                <div className="mt-4 rounded-lg border border-border/60 bg-background/70 p-3">
                  <button
                    type="button"
                    onClick={() => setShowSafetyGuidance((prev) => !prev)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <span className="text-sm font-medium">Meetup safety guidance</span>
                    {showSafetyGuidance ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  {showSafetyGuidance && (
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {item.safety_guidance.map((tip: string, index: number) => (
                        <p key={index}>{tip}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {user && String(item.seller_id) !== String(user.id) && (
                <div className="mt-4 rounded-lg border border-border/60 bg-background/70 p-3 space-y-3">
                  <div>
                    <p className="text-sm font-medium">Rate this seller</p>
                    <p className="text-xs text-muted-foreground">Help other students spot trustworthy sellers.</p>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Button
                        key={rating}
                        type="button"
                        variant={reviewRating === rating ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setReviewRating(rating)}
                      >
                        {rating}
                      </Button>
                    ))}
                  </div>
                  <Textarea
                    value={reviewText}
                    onChange={(event) => setReviewText(event.target.value)}
                    rows={3}
                    placeholder="Share a short note about responsiveness, honesty, or meetup safety..."
                  />
                  <Button onClick={handleReviewSubmit} disabled={submittingReview}>
                    {submittingReview ? 'Saving review...' : 'Submit review'}
                  </Button>
                </div>
              )}
            </div>

            {item.seller_reviews?.length > 0 && (
              <div className="rounded-lg border border-border/60 p-4">
                <h3 className="text-lg font-semibold mb-3">Recent seller reviews</h3>
                <div className="space-y-3">
                  {item.seller_reviews.map((review: any) => (
                    <div key={review.id} className="rounded-md bg-muted/40 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">
                          {review.reviewer_full_name || review.reviewer_username || 'Student reviewer'}
                        </p>
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          {review.rating}
                        </div>
                      </div>
                      {review.review_text && (
                        <p className="mt-2 text-sm text-muted-foreground">{review.review_text}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {item.transaction_history?.length > 0 && (
              <div className="rounded-lg border border-border/60 p-4">
                <h3 className="text-lg font-semibold mb-3">Transaction history</h3>
                <div className="space-y-2 text-sm">
                  {item.transaction_history.map((transaction: any) => (
                    <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-md bg-muted/40 p-3">
                      <div>
                        <p className="font-medium">
                          KSh {Number(transaction.amount || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.buyer_full_name || transaction.buyer_username || 'Buyer'} • {transaction.meetup_status}
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize">{transaction.payment_status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold mb-3">Description</h3>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {item.description || 'No description provided.'}
              </p>
            </div>

            <Separator />

            {/* Listing-specific Details */}
            {listingKind === 'hostel' ? (
              <div>
                <h3 className="text-lg font-semibold mb-4">Hostel Details</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold">Overview</h4>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Hostel Title/Name</span>
                        <p className="text-sm font-medium break-words">{item.title}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Rent per month</span>
                        <p className="text-sm font-medium">
                          {typeof item.price === 'number' ? `KSh ${item.price.toLocaleString()}` : item.price}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Listing type</span>
                        <p className="text-sm font-medium capitalize">{listingKind}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Location</span>
                        <p className="text-sm font-medium break-words">{item.location || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Phone number</span>
                        <p className="text-sm font-medium break-words">{item.phone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold">Accommodation Setup</h4>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Room type</span>
                        <p className="text-sm font-medium capitalize">{hostelDetails.room_type || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Beds available</span>
                        <p className="text-sm font-medium">{hostelDetails.beds_available ?? 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Gender Policy</span>
                        <p className="text-sm font-medium capitalize">{hostelDetails.gender_policy || 'N/A'}</p>
                      </div>
                      <div className="space-y-2">
                        <span className="text-sm text-muted-foreground">Amenities</span>
                        {hostelDetails.amenities && hostelDetails.amenities.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {hostelDetails.amenities.map((amenity: string) => (
                              <Badge key={amenity} variant="secondary" className="text-xs">
                                {amenity}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm font-medium">N/A</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : listingKind === 'service' ? (
              <div>
                <h3 className="text-lg font-semibold mb-4">Service Details</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold">Overview</h4>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Service Name</span>
                        <p className="text-sm font-medium break-words">{item.title}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Starting Price</span>
                        <p className="text-sm font-medium">
                          {typeof item.price === 'number' ? `KSh ${item.price.toLocaleString()}` : item.price}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Listing type</span>
                        <p className="text-sm font-medium capitalize">{listingKind}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Location</span>
                        <p className="text-sm font-medium break-words">{item.location || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Phone number</span>
                        <p className="text-sm font-medium break-words">{item.phone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold">Service Setup</h4>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Pricing model</span>
                        <p className="text-sm font-medium break-words">
                          {pricingModelLabelMap[serviceDetails.pricing_model || ''] || serviceDetails.pricing_model || 'N/A'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Service area</span>
                        <p className="text-sm font-medium break-words">{serviceDetails.service_area || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Availability</span>
                        <p className="text-sm font-medium break-words">{serviceDetails.availability || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold mb-4">Product Details</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold">Overview</h4>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Condition</span>
                        <p className="text-sm font-medium capitalize">{item.condition?.replace('-', ' ') || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Category</span>
                        <p className="text-sm font-medium capitalize break-words">{item.category_name || item.category}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Location</span>
                        <p className="text-sm font-medium break-words">{item.location || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Negotiable</span>
                        <p className="text-sm font-medium">{item.is_negotiable ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold">Listing Status</h4>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <div>
                          <Badge variant="outline" className="text-xs">
                            {item.status && String(item.status).toLowerCase() !== 'active' ? item.status : 'Available'}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Posted</span>
                        <p className="text-sm font-medium">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recently'}
                        </p>
                      </div>
                      {item.updated_at && (
                        <div className="space-y-1">
                          <span className="text-sm text-muted-foreground">Updated</span>
                          <p className="text-sm font-medium">
                            {new Date(item.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {item.tags && item.tags.length > 0 && (
                    <div className="col-span-full">
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Enhanced Communication Section */}
            <div className="bg-muted/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Contact Seller</h3>

              <div className="space-y-3">
                {item.phone && (
                  <a href={`tel:${item.phone}`} className="block">
                    <Button variant="outline" className="w-full" size="lg">
                      <Phone className="h-4 w-4 mr-2" />
                      Call Seller
                    </Button>
                  </a>
                )}

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Response time: Usually within 2 hours</p>
                  <p>• Reserve items for 24 hours</p>
                  <p>• Meet at campus locations for safety</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Similar Products Section */}
        {similarProducts.length > 0 && (
          <>
            <Separator className="my-12" />
            <div className="max-w-6xl mx-auto">
              <h3 className="text-xl font-semibold mb-6">Similar Products</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {similarProducts.map((product) => (
                  <Link
                    key={product.id}
                    to={`/marketplace/${product.id}`}
                    className="group block bg-card rounded-lg border border-border overflow-hidden hover:border-primary/50 hover:shadow-md transition-all"
                  >
                    <div className="aspect-square bg-muted">
                      <img
                        src={normalizeImageUrl(product.image_urls?.[0] || product.image)}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={applyImageFallback}
                      />
                    </div>
                    <div className="p-3">
                      <h4 className="font-medium line-clamp-2 text-sm group-hover:text-primary transition-colors">
                        {product.title}
                      </h4>
                      <p className="text-primary font-semibold text-sm mt-1">
                        {typeof product.price === 'number' ? `KSh ${product.price.toLocaleString()}` : product.price}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Recently Viewed Section */}
        {recentlyViewed.length > 0 && (
          <>
            <Separator className="my-12" />
            <div className="max-w-6xl mx-auto">
              <h3 className="text-xl font-semibold mb-6">Recently Viewed</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {recentlyViewed.map((product) => (
                  <Link
                    key={product.id}
                    to={`/marketplace/${product.id}`}
                    className="group block bg-card rounded-lg border border-border overflow-hidden hover:border-primary/50 hover:shadow-md transition-all"
                  >
                    <div className="aspect-square bg-muted">
                      <img
                        src={normalizeImageUrl(product.image_urls?.[0] || product.image)}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={applyImageFallback}
                      />
                    </div>
                    <div className="p-3">
                      <h4 className="font-medium line-clamp-2 text-sm group-hover:text-primary transition-colors">
                        {product.title}
                      </h4>
                      <p className="text-primary font-semibold text-sm mt-1">
                        {typeof product.price === 'number' ? `KSh ${product.price.toLocaleString()}` : product.price}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}

        <Separator className="my-12" />

        {/* Reviews & Comments Section */}
        <div className="max-w-4xl mx-auto">
          <h3 className="text-xl font-semibold mb-6">Questions & Answers</h3>
          <CommentList
            listingId={id!}
            currentUserId={user?.id}
          />
        </div>
      </main>

      <MessageDialog
        open={messageDialogOpen}
        onOpenChange={setMessageDialogOpen}
        sellerId={item?.seller_id}
        sellerName={item?.seller_full_name || item?.seller_username}
        listingId={parseInt(id!)}
        listingTitle={item?.title}
        sellerPhone={item?.phone}
      />

      {/* Image Lightbox Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl w-full p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Product Images</DialogTitle>
            <DialogDescription className="sr-only">
              View enlarged images of the product
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            {item?.image_urls && item.image_urls.length > 0 && (
              <>
                <img
                  src={normalizeImageUrl(item.image_urls[currentImageIndex])}
                  alt={`${item.title} ${currentImageIndex + 1}`}
                  className="w-full h-auto max-h-[80vh] object-contain"
                  onError={applyImageFallback}
                />

                {/* Navigation */}
                {item.image_urls.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                      onClick={prevImage}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                      onClick={nextImage}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  </>
                )}

                {/* Image Counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                  {currentImageIndex + 1} / {item.image_urls.length}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reserve Item Dialog */}
      <Dialog open={reserveDialogOpen} onOpenChange={setReserveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reserve This Item</DialogTitle>
            <DialogDescription>
              Send a message to the seller to reserve this item for 24 hours.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <textarea
                className="w-full p-3 border border-border rounded-md resize-none"
                rows={3}
                placeholder="Hi! I'd like to reserve this item. When can we meet on campus?"
                value={reserveMessage}
                onChange={(e) => setReserveMessage(e.target.value)}
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/50 p-3 rounded-md">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                <Clock3 className="h-3 w-3 inline mr-1" />
                Item will be held for 24 hours. Contact the seller promptly to complete the transaction.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setReserveDialogOpen(false)}
                disabled={isReserving}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleReserve}
                disabled={isReserving || !reserveMessage.trim()}
              >
                {isReserving ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Reserving...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 mr-2" />
                    Reserve Item
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report listing</DialogTitle>
            <DialogDescription>
              Share why this listing should be reviewed by moderators.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="report-listing-reason">Reason</Label>
            <Textarea
              id="report-listing-reason"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Fraud, prohibited item, misleading details..."
              rows={3}
            />
            <Label htmlFor="report-listing-details">Extra details</Label>
            <Textarea
              id="report-listing-details"
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Add screenshots, meetup concerns, or pricing red flags."
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleReportListing}>Submit report</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default MarketplaceDetail;
