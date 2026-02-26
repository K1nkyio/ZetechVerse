import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { eventsApi, type EventData } from '@/api/events.api';

const UpcomingEvents = () => {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUpcomingEvents = async () => {
      try {
        setLoading(true);
        setError(null);
        // Get upcoming events
        const data = await eventsApi.getUpcomingEvents(4);
        setEvents(data || []);
      } catch (err: any) {
        console.error('Failed to fetch upcoming events:', err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingEvents();
  }, []);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    };
  };
  return (
    <div className="bg-card rounded-2xl border border-border p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Upcoming Events</h2>
            <p className="text-sm text-muted-foreground">Stay updated with campus events and activities</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" asChild className="gap-1 w-full sm:w-auto">
          <Link to="/events">
            All
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>

      <div className="space-y-4">
        {loading ? (
          // Loading skeletons
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="p-4 rounded-xl bg-muted/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-full" />
                  <div className="flex gap-4">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          ))
        ) : events.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No upcoming events available.</p>
        ) : (
          events.map((event) => {
            const { date, time } = formatDateTime(event.start_date);
            return (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="block p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Badge variant="outline" className="mb-2 text-xs capitalize">{event.type}</Badge>
                    <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-1">
                      {event.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {date} • {time}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {event.current_attendees || 0}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
};

export default UpcomingEvents;
