import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/ui/page-header';
import { useToast } from '@/hooks/use-toast';
import { applyImageFallback, normalizeImageUrl, normalizeVideoUrl } from '@/lib/image';
import { 
  Search, 
  Calendar,
  MapPin,
  Clock,
  Users,
  CalendarCheck,
  Zap,
  Music,
  Trophy,
  BookOpen,
  Share2,
} from 'lucide-react';
import { eventsApi, EventData } from '@/api/events.api';

const categories = [
  { id: 'all', name: 'All Events', icon: Calendar },
  { id: 'hackathon', name: 'Hackathons', icon: Zap },
  { id: 'workshop', name: 'Workshops', icon: BookOpen },
  { id: 'social', name: 'Social', icon: Music },
  { id: 'competition', name: 'Competitions', icon: Trophy },
];

const isLikelyVideo = (url: string) => /\.(mp4|webm|ogg|mov|m4v|avi)(\?|#|$)/i.test(url);

const toMediaArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value !== 'string') return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
};

const getEventImageSrc = (event: EventData & Record<string, unknown>): string | null => {
  const directImage = typeof event.image_url === 'string' ? event.image_url.trim() : '';
  if (directImage) return normalizeImageUrl(directImage);

  const imageList = toMediaArray(event.image_urls);
  if (imageList.length > 0) return normalizeImageUrl(imageList[0]);

  const fromMedia = toMediaArray(event.media_urls).find((url) => !isLikelyVideo(url));
  return fromMedia ? normalizeImageUrl(fromMedia) : null;
};

const getEventVideoSrc = (event: EventData & Record<string, unknown>): string | null => {
  const directVideo = typeof event.video_url === 'string' ? event.video_url.trim() : '';
  if (directVideo) return normalizeVideoUrl(directVideo);

  const videoList = toMediaArray(event.video_urls);
  if (videoList.length > 0) return normalizeVideoUrl(videoList[0]);

  const fromMedia = toMediaArray(event.media_urls).find((url) => isLikelyVideo(url));
  return fromMedia ? normalizeVideoUrl(fromMedia) : null;
};

const Events = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Format date and time
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await eventsApi.getAllEvents({ 
        status: 'published',
        limit: 100 
      });
      setEvents(response);
    } catch (err: any) {
      console.error('Failed to fetch events:', err);
      setError('Failed to load events');
      toast({
        title: 'Error',
        description: 'Failed to load events',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter((event: EventData) => {
    const matchesCategory = activeCategory === 'all' || event.type === activeCategory;
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleShare = async (event: any) => {
    const url = `${window.location.origin}/events/${event.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `Check out this event: ${event.title}`,
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
        description: 'Event link copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Share',
        description: `Share this link: ${text}`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Hero */}
        <PageHeader
          title="Campus Events"
          centered
          icon={<Calendar className="h-6 w-6 text-primary" aria-hidden="true" />}
          description="Discover hackathons, workshops, social events, and competitions happening at Zetech."
        />

        {/* Search */}
        <div className="max-w-xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search events..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Categories */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-8 flex justify-center">
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
        {!loading && (
          <p className="text-muted-foreground mb-6 text-center">
            Showing {filteredEvents.length} events
          </p>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="rounded-2xl border border-border overflow-hidden">
                <Skeleton className="aspect-video w-full" />
                <div className="p-5 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-16">
            <p className="text-destructive">{error}</p>
            <Button onClick={fetchEvents} className="mt-4">
              Try Again
            </Button>
          </div>
        )}

        {/* Events Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event: EventData & Record<string, unknown>) => {
              const imageSrc = getEventImageSrc(event);
              const videoSrc = getEventVideoSrc(event);

              return (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="group block bg-card rounded-2xl border border-border overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all"
                >
                  <div className="aspect-video bg-gradient-to-br from-primary/10 to-accent/10">
                    {imageSrc ? (
                      <img
                        src={imageSrc}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={applyImageFallback}
                      />
                    ) : videoSrc ? (
                      <video
                        src={videoSrc}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Calendar className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="secondary" className="capitalize">{event.type}</Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(event.start_date)}</span>
                    </div>
                    <h3 className="font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {event.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {event.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(event.start_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(event.start_date)}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      )}
                      {event.max_attendees && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {event.max_attendees} attending
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="px-5 pb-5">
                    <div className="flex items-center justify-between">
                      <Button className="gap-2" variant="outline" onClick={(e) => {
                        e.preventDefault();
                        navigate(`/events/${event.id}`);
                      }}>
                        <CalendarCheck className="h-4 w-4" />
                        View Details
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault();
                          handleShare(event);
                        }}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {!loading && !error && filteredEvents.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No events found. Try a different search or category.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Events;
