import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { eventsApi, type Event } from "@/api/events.api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Edit,
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Mail,
  Phone,
  ExternalLink,
  User,
  Clock
} from "lucide-react";

export default function AdminViewEvent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchEvent();
    }
  }, [id]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const data = await eventsApi.getEvent(parseInt(id!));
      setEvent(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load event",
        variant: "destructive",
      });
      navigate("/admin/events");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout variant="admin">
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-64" />
          </div>
          <Card className="admin-card">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  if (!event) {
    return (
      <AdminLayout variant="admin">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Event Not Found</h1>
            <p className="text-muted-foreground">The event you're looking for doesn't exist.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isUpcoming = new Date(event.start_date) > new Date();
  const isOngoing = new Date(event.start_date) <= new Date() && new Date(event.end_date) >= new Date();

  return (
    <AdminLayout variant="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/events")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-display text-foreground">{event.title}</h1>
              <p className="text-muted-foreground">View event details</p>
            </div>
          </div>
          <Button onClick={() => navigate(`/admin/events/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Event Image */}
            {event.image_url && (
              <Card className="admin-card">
                <CardContent className="pt-6">
                  <img
                    src={event.image_url}
                    alt={event.title}
                    className="w-full h-64 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder-image.jpg";
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Description */}
            <Card className="admin-card">
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{event.description}</p>
              </CardContent>
            </Card>

            {/* Agenda */}
            {event.agenda && event.agenda.length > 0 && (
              <Card className="admin-card">
                <CardHeader>
                  <CardTitle>Event Agenda</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="list-decimal list-inside space-y-2">
                    {event.agenda.map((item, index) => (
                      <li key={index} className="text-foreground">{item}</li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            {/* Requirements */}
            {event.requirements && event.requirements.length > 0 && (
              <Card className="admin-card">
                <CardHeader>
                  <CardTitle>Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {event.requirements.map((req, index) => (
                      <Badge key={index} variant="secondary">{req}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {/* Status & Info */}
            <Card className="admin-card">
              <CardHeader>
                <CardTitle>Event Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <StatusBadge status={event.status} />
                  {isOngoing && (
                    <Badge variant="default" className="ml-2">Ongoing</Badge>
                  )}
                  {isUpcoming && (
                    <Badge variant="secondary" className="ml-2">Upcoming</Badge>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Type</p>
                  <Badge variant="outline" className="capitalize">{event.type}</Badge>
                </div>

                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{event.organizer_full_name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-foreground font-medium">Start</div>
                    <div className="text-sm text-muted-foreground">{formatDateTime(event.start_date)}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <div className="text-foreground font-medium">End</div>
                    <div className="text-sm text-muted-foreground">{formatDateTime(event.end_date)}</div>
                  </div>
                </div>

                {event.location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <div className="text-foreground font-medium">Location</div>
                      <div className="text-sm text-muted-foreground">{event.location}</div>
                      {event.venue_details && (
                        <div className="text-xs text-muted-foreground mt-1">{event.venue_details}</div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {event.current_attendees}
                    {event.max_attendees ? `/${event.max_attendees}` : ""} attendees
                  </span>
                </div>

                {event.is_paid && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground font-medium">
                      KES {event.ticket_price.toLocaleString()}
                    </span>
                  </div>
                )}

                {event.registration_deadline && (
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <div className="text-foreground font-medium">Registration Deadline</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDateTime(event.registration_deadline)}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact Information */}
            {(event.contact_email || event.contact_phone || event.website_url) && (
              <Card className="admin-card">
                <CardHeader>
                  <CardTitle>Contact & Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {event.contact_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${event.contact_email}`} className="text-primary hover:underline">
                        {event.contact_email}
                      </a>
                    </div>
                  )}

                  {event.contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${event.contact_phone}`} className="text-primary hover:underline">
                        {event.contact_phone}
                      </a>
                    </div>
                  )}

                  {event.website_url && (
                    <div className="flex items-start gap-2">
                      <ExternalLink className="h-4 w-4 text-muted-foreground mt-1" />
                      <a
                        href={event.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline break-all"
                      >
                        {event.website_url}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Statistics */}
            <Card className="admin-card">
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Views</span>
                  <span className="font-medium">{event.views_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Attendees</span>
                  <span className="font-medium">{event.current_attendees}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">
                    {new Date(event.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span className="font-medium">
                    {new Date(event.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

