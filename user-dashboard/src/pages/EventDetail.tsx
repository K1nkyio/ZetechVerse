import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Calendar,
  Users,
  Share2,
  Loader,
  AlertCircle,
  ThumbsUp,
} from 'lucide-react';
import { eventsApi, EventData } from '@/api/events.api';
import { apiClient } from '@/api/base';
import MediaGallery, { type MediaGalleryItem } from '@/components/MediaGallery';

const isLikelyVideo = (url: string) => /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url);

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);

  const { toast } = useToast();

  const mediaItems = useMemo<MediaGalleryItem[]>(() => {
    if (!event) return [];

    const list: MediaGalleryItem[] = [];
    const seen = new Set<string>();

    const addItem = (type: 'image' | 'video', src?: string | null, options?: { alt?: string; poster?: string }) => {
      const value = src?.trim();
      if (!value) return;

      const key = `${type}:${value}`;
      if (seen.has(key)) return;

      seen.add(key);
      list.push({
        type,
        src: value,
        alt: options?.alt,
        poster: options?.poster,
      });
    };

    addItem('image', event.image_url, { alt: event.title });
    addItem('video', event.video_url, { alt: `${event.title} video`, poster: event.image_url });

    event.image_urls?.forEach((url) => addItem('image', url, { alt: event.title }));
    event.video_urls?.forEach((url) => addItem('video', url, { alt: `${event.title} video`, poster: event.image_url }));
    event.media_urls?.forEach((url) =>
      addItem(isLikelyVideo(url) ? 'video' : 'image', url, {
        alt: event.title,
        poster: event.image_url,
      })
    );

    return list;
  }, [event]);

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

  const fetchEvent = async () => {
    try {
      setLoading(true);
      setError(null);
      const eventData = await eventsApi.getEventById(id!);
      setEvent(eventData);
      setIsLiked(!!eventData.likedByMe);
    } catch (err: any) {
      console.error('Failed to fetch event:', err);
      setError('Failed to load event details. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to load event details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      void fetchEvent();
    }
  }, [id]);

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: event?.title,
          text: `Check out this event: ${event?.title}`,
          url,
        });
      } catch {
        await navigator.clipboard.writeText(url);
      }
    } else {
      await navigator.clipboard.writeText(url);
    }

    toast({
      title: 'Link copied',
      description: 'Event link copied to your clipboard.',
    });
  };

  const handleLike = async () => {
    if (!event) return;
    if (!requireAuth('like events')) return;
    if (likeBusy) return;

    const previousLikes = event.likes_count || 0;
    const optimisticLiked = !isLiked;

    try {
      setLikeBusy(true);
      setIsLiked(optimisticLiked);
      setEvent((prev) =>
        prev
          ? {
              ...prev,
              likes_count: optimisticLiked ? previousLikes + 1 : Math.max(0, previousLikes - 1),
            }
          : prev
      );

      const response = await eventsApi.toggleLike(event.id);
      setIsLiked(response.liked);
      setEvent((prev) => (prev ? { ...prev, likes_count: response.likes_count } : prev));
    } catch (err: any) {
      setIsLiked((prev) => !prev);
      setEvent((prev) => (prev ? { ...prev, likes_count: previousLikes } : prev));
      toast({
        title: 'Error',
        description: err.message || 'Could not update like status.',
        variant: 'destructive',
      });
    } finally {
      setLikeBusy(false);
    }
  };

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

  if (error || !event) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center gap-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-destructive text-lg">{error || 'Event not found'}</p>
            <Button onClick={() => navigate('/events')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Events
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const eventDate = new Date(event.start_date);
  const eventEndDate = new Date(event.end_date);
  const isUpcoming = eventDate > new Date();
  const agendaItems = Array.isArray(event.agenda) ? event.agenda : (event.agenda ? [event.agenda] : []);
  const requirementItems = Array.isArray(event.requirements) ? event.requirements : (event.requirements ? [event.requirements] : []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Link to="/events">
          <Button variant="ghost" className="gap-2 mb-8">
            <ArrowLeft className="h-4 w-4" />
            Back to Events
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <MediaGallery
              items={mediaItems}
              className="mb-8"
              overlay={
                <>
                  <Badge className="absolute top-4 left-4 capitalize text-lg px-3 py-1">
                    {event.type}
                  </Badge>
                  <Badge
                    variant={isUpcoming ? 'default' : 'secondary'}
                    className="absolute top-4 right-4 capitalize text-lg px-3 py-1"
                  >
                    {isUpcoming ? 'Upcoming' : 'Past Event'}
                  </Badge>
                </>
              }
              emptyState={
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                  <Calendar className="h-16 w-16 text-muted-foreground/50" />
                </div>
              }
            />

            <h1 className="text-4xl md:text-5xl font-bold mb-4">{event.title}</h1>

            <div className="space-y-3 text-muted-foreground mb-8">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="text-base">
                  {eventDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-base">
                  {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' - '}
                  {eventEndDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {event.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span className="text-base">{event.location}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-base">
                  {event.current_attendees || 0}
                  {event.max_attendees ? ` / ${event.max_attendees}` : ''} attending
                </span>
              </div>
            </div>

            <Separator className="my-8" />

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4">About This Event</h2>
              <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </section>

            {agendaItems.length > 0 && (
              <section className="mb-12">
                <h2 className="text-2xl font-bold mb-4">Agenda</h2>
                <div className="space-y-2 text-muted-foreground">
                  {agendaItems.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </section>
            )}

            {requirementItems.length > 0 && (
              <section className="mb-12">
                <h2 className="text-2xl font-bold mb-4">Requirements</h2>
                <div className="space-y-2 text-muted-foreground">
                  {requirementItems.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </section>
            )}

            <div className="flex items-center gap-4 mb-8">
              <Button
                variant={isLiked ? 'secondary' : 'outline'}
                size="sm"
                onClick={handleLike}
                disabled={likeBusy}
                aria-label={isLiked ? 'Unlike event' : 'Like event'}
              >
                <ThumbsUp className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current text-red-500' : ''}`} />
                {isLiked ? 'Liked' : 'Like'}
                <span className="ml-1 text-xs text-muted-foreground">
                  {event.likes_count || 0}
                </span>
              </Button>

              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground mb-2">Event Status</p>
                <Badge className="text-lg px-3 py-1 capitalize">
                  {event.status || 'published'}
                </Badge>
              </div>

              <Button
                onClick={handleShare}
                variant="outline"
                className="w-full gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share Event
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EventDetail;
