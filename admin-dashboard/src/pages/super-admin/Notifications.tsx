import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, Column } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Check, CheckCheck, MoreHorizontal, Trash2, Plus, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { notificationsApi, type Notification } from "@/api/notifications.api";
import { Skeleton } from "@/components/ui/skeleton";

export default function SuperAdminNotifications() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [systemNotification, setSystemNotification] = useState({
    type: 'announcement' as 'system' | 'maintenance' | 'update' | 'announcement',
    title: '',
    message: '',
  });

  useEffect(() => {
    fetchNotifications();
  }, [filter, pagination.page]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const filters: any = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (filter === "unread") {
        filters.is_read = false;
      } else if (filter === "read") {
        filters.is_read = true;
      }

      const response = await notificationsApi.getNotifications(filters);
      setNotifications(response.notifications);
      setPagination(response.pagination);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.is_read) return;

    try {
      await notificationsApi.markAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
      toast({
        title: "Success",
        description: "Notification marked as read",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to mark all notifications as read",
        variant: "destructive",
      });
    }
  };

  const handleDeleteNotification = async (notification: Notification) => {
    try {
      await notificationsApi.deleteNotification(notification.id);
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
      toast({
        title: "Success",
        description: "Notification deleted",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete notification",
        variant: "destructive",
      });
    }
  };

  const handleCreateSystemNotification = async () => {
    if (!systemNotification.title.trim() || !systemNotification.message.trim()) {
      toast({
        title: "Validation Error",
        description: "Title and message are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await notificationsApi.createSystemNotification(systemNotification);
      toast({
        title: "Success",
        description: `System notification sent to ${result.count} users`,
      });
      setCreateDialogOpen(false);
      setSystemNotification({ type: 'announcement', title: '', message: '' });
      // Refresh notifications
      fetchNotifications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create system notification",
        variant: "destructive",
      });
    }
  };

  const getTypeBadge = (type: string) => {
    const typeLabels: Record<string, string> = {
      system: "System",
      personal: "Personal",
      reminder: "Reminder",
      alert: "Alert",
      maintenance: "Maintenance",
      update: "Update",
      announcement: "Announcement",
      marketplace: "Marketplace",
      opportunities: "Opportunities",
      events: "Events",
      confessions: "Confessions",
      posts: "Posts",
      confession_like: "Confession Like",
      confession_comment: "Confession Comment",
      event_reminder: "Event Reminder",
      application_update: "Application Update",
      listing_sold: "Listing Sold",
      blog_comment: "Blog Comment"
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        type === 'system' || type === 'maintenance' ? 'bg-blue-100 text-blue-800' :
        type === 'announcement' ? 'bg-purple-100 text-purple-800' :
        type === 'update' ? 'bg-green-100 text-green-800' :
        type === 'alert' ? 'bg-red-100 text-red-800' :
        type === 'personal' ? 'bg-orange-100 text-orange-800' :
        type === 'marketplace' ? 'bg-indigo-100 text-indigo-800' :
        type === 'opportunities' ? 'bg-cyan-100 text-cyan-800' :
        type === 'events' ? 'bg-pink-100 text-pink-800' :
        type === 'confessions' ? 'bg-rose-100 text-rose-800' :
        type === 'posts' ? 'bg-amber-100 text-amber-800' :
        ['confession_like', 'confession_comment', 'blog_comment'].includes(type) ? 'bg-emerald-100 text-emerald-800' :
        type === 'event_reminder' ? 'bg-violet-100 text-violet-800' :
        type === 'application_update' ? 'bg-sky-100 text-sky-800' :
        type === 'listing_sold' ? 'bg-lime-100 text-lime-800' :
        'bg-gray-100 text-gray-800'
      }`}>
        {typeLabels[type] || type}
      </span>
    );
  };

  const columns: Column<Notification>[] = [
    {
      key: "type",
      header: "Type",
      render: (notification) => getTypeBadge(notification.type),
    },
    {
      key: "title",
      header: "Title",
      render: (notification) => (
        <div>
          <p className="font-medium text-foreground">{notification.title}</p>
          <p className="text-sm text-muted-foreground line-clamp-2 max-w-xs">
            {notification.message}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (notification) => (
        <StatusBadge status={notification.is_read ? "approved" : "pending"} />
      ),
    },
    {
      key: "created_at",
      header: "Date",
      render: (notification) => (
        <span className="text-muted-foreground text-sm">
          {new Date(notification.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (notification) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            {!notification.is_read && (
              <DropdownMenuItem onClick={() => handleMarkAsRead(notification)}>
                <Check className="mr-2 h-4 w-4" />
                Mark as Read
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => handleDeleteNotification(notification)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <AdminLayout variant="super-admin">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
            <Crown className="h-7 w-7 sm:h-8 sm:w-8 text-purple-600 shrink-0" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground break-words">System Notifications</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Manage system-wide notifications and alerts</p>
              {unreadCount > 0 && (
                <div className="mt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {unreadCount} unread
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex w-full md:w-auto flex-wrap gap-2">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto h-auto py-2.5 whitespace-normal text-left sm:text-center bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Create System Notification
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Create System Notification
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Notification Type</Label>
                    <Select
                      value={systemNotification.type}
                      onValueChange={(value: any) => setSystemNotification(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="announcement">Announcement</SelectItem>
                        <SelectItem value="system">System Alert</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="update">Update</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={systemNotification.title}
                      onChange={(e) => setSystemNotification(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Notification title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      value={systemNotification.message}
                      onChange={(e) => setSystemNotification(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Notification message"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateSystemNotification}>
                      Send Notification
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {unreadCount > 0 && (
              <Button onClick={handleMarkAllAsRead} variant="outline" className="w-full sm:w-auto h-auto py-2.5 whitespace-normal text-left sm:text-center">
                <CheckCheck className="mr-2 h-4 w-4" />
                Mark All as Read
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card className="admin-card">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-48">
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Filter notifications" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">All Notifications</SelectItem>
                    <SelectItem value="unread">Unread Only</SelectItem>
                    <SelectItem value="read">Read Only</SelectItem>
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
              System Notifications ({loading ? "..." : notifications.length})
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
                data={notifications}
                columns={columns}
                searchKey="title"
                searchPlaceholder="Search notifications..."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
