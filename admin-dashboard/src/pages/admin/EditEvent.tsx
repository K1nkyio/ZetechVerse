import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { EventForm } from "@/components/admin/EventForm";
import { eventsApi, type Event, type CreateEventData } from "@/api/events.api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminEditEvent() {
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

  const handleSubmit = async (data: CreateEventData) => {
    if (!id) return;
    await eventsApi.updateEvent(parseInt(id), data);
    navigate("/admin/events");
  };

  if (loading) {
    return (
      <AdminLayout variant="admin">
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Card className="admin-card">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {Array.from({ length: 8 }).map((_, i) => (
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

  return (
    <AdminLayout variant="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Edit Event</h1>
          <p className="text-muted-foreground">Update event details</p>
        </div>

        <EventForm
          initialData={event}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/admin/events")}
          isEditing={true}
        />
      </div>
    </AdminLayout>
  );
}

