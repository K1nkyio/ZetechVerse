import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, Column } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Eye, Edit, Trash2, MoreHorizontal, PlusCircle, Search, Calendar, MapPin, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { eventsApi, type Event } from "@/api/events.api";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminEvents() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // Fetch data when filters change
  useEffect(() => {
    console.log('Events useEffect triggered by filters, calling fetchEvents');
    fetchEvents();
  }, [statusFilter, typeFilter, searchQuery, pagination.page]);

  // Always fetch data when component mounts (useful after navigation from create page)
  useEffect(() => {
    console.log('Events component mounted/refreshed - fetching data');
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      console.log('Fetching events with filters:', {
        page: pagination.page,
        limit: pagination.limit,
        statusFilter,
        typeFilter,
        searchQuery
      });

      const filters: any = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery || undefined,
      };

      filters.status = statusFilter;

      if (typeFilter !== "all") {
        filters.type = typeFilter;
      }

      console.log('API call filters:', filters);
      const response = await eventsApi.getEvents(filters);
      console.log('API response:', response);

      setEvents(response.events);
      setPagination(response.pagination);
      console.log('Set events:', response.events.length, 'items');
    } catch (error: any) {
      console.error('Failed to load events:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!eventToDelete) return;

    try {
      await eventsApi.deleteEvent(eventToDelete.id);
      toast({
        title: "Success",
        description: "Event deleted successfully",
      });
      setDeleteDialogOpen(false);
      setEventToDelete(null);
      fetchEvents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete event",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (event: Event) => {
    return <StatusBadge status={event.status} />;
  };

  const isUpcoming = (event: Event) => {
    return new Date(event.start_date) > new Date();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const columns: Column<Event>[] = [
    {
      key: "title",
      header: "Event",
      render: (event) => (
        <div className="max-w-xs">
          <p className="font-medium text-foreground truncate">{event.title}</p>
          <p className="text-xs text-muted-foreground">
            {event.organizer_full_name} • {event.views_count} views
          </p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (event) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
          {event.type}
        </span>
      ),
    },
    {
      key: "date",
      header: "Date & Time",
      render: (event) => (
        <div className="text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDateTime(event.start_date)}
          </div>
          {isUpcoming(event) && (
            <div className="text-xs text-green-600 mt-1">Upcoming</div>
          )}
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (event) => (
        <div className="text-sm text-muted-foreground">
          {event.location ? (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {event.location}
            </div>
          ) : (
            "TBD"
          )}
        </div>
      ),
    },
    {
      key: "attendees",
      header: "Attendees",
      render: (event) => (
        <div className="text-sm">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-muted-foreground" />
            {event.current_attendees}
            {event.max_attendees && `/${event.max_attendees}`}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (event) => getStatusBadge(event),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (event) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem onClick={() => navigate(`/admin/events/${event.id}`)}>
              <Eye className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/admin/events/${event.id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setEventToDelete(event);
                setDeleteDialogOpen(true);
              }}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const filteredEvents = events.filter((event) => {
    if (statusFilter !== "all" && event.status !== statusFilter) {
      return false;
    }
    if (typeFilter !== "all" && event.type !== typeFilter) {
      return false;
    }
    return true;
  });

  return (
    <AdminLayout variant="admin">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Events</h1>
            <p className="text-muted-foreground">Manage university events and activities</p>
          </div>
          <Button
            onClick={() => navigate("/admin/events/create")}
            className="gradient-primary text-primary-foreground"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Event
          </Button>
        </div>

        {/* Filters */}
        <Card className="admin-card">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background"
                />
              </div>
              <div className="w-48">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="hackathon">Hackathon</SelectItem>
                    <SelectItem value="competition">Competition</SelectItem>
                    <SelectItem value="seminar">Seminar</SelectItem>
                    <SelectItem value="social">Social Event</SelectItem>
                    <SelectItem value="cultural">Cultural Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="font-display">
              All Events ({loading ? "..." : filteredEvents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <DataTable
                data={filteredEvents}
                columns={columns}
                searchKey="title"
                searchPlaceholder="Search events..."
              />
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the event "{eventToDelete?.title}". This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}

