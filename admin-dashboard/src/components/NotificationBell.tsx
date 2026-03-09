import { useState, useEffect } from "react";
import { Bell, X, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { notificationsApi, type Notification } from "@/api/notifications.api";
import { apiClient } from "@/api/base";
import { useNavigate } from "react-router-dom";

interface NotificationBellProps {
  variant?: "admin" | "super-admin";
}

export function NotificationBell({ variant = "admin" }: NotificationBellProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const hasToken = () => !!apiClient.getToken();
  const notificationsRoute = variant === "super-admin" ? "/super-admin/notifications" : "/admin/notifications";

  useEffect(() => {
    if (!hasToken()) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }
    fetchUnreadCount();
    fetchNotifications();
  }, [variant]);

  const fetchUnreadCount = async () => {
    if (!hasToken()) return;
    try {
      const result = await notificationsApi.getUnreadCount();
      setUnreadCount(result.unread_count);
    } catch (error) {
      // Suppress noisy 401s while auth redirects happen.
    }
  };

  const fetchNotifications = async () => {
    if (!hasToken()) return;
    try {
      setLoading(true);
      const result = await notificationsApi.getNotifications({ limit: 10 });
      setNotifications(result.notifications);
    } catch (error) {
      // Suppress noisy 401s while auth redirects happen.
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
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
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
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

  const handleDeleteNotification = async (notificationId: number) => {
    try {
      const deletedNotification = notifications.find((n) => n.id === notificationId);
      await notificationsApi.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "system":
      case "maintenance":
        return "🔧";
      case "announcement":
        return "📢";
      case "update":
        return "⬆️";
      case "alert":
        return "⚠️";
      case "personal":
        return "👤";
      case "marketplace":
        return "🛒";
      case "opportunities":
        return "💼";
      case "events":
        return "📅";
      case "confessions":
        return "💬";
      case "posts":
        return "📝";
      case "confession_like":
        return "👍";
      case "confession_comment":
      case "blog_comment":
        return "💬";
      case "event_reminder":
        return "⏰";
      case "application_update":
        return "📨";
      case "listing_sold":
        return "💸";
      default:
        return "🔔";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "system":
      case "maintenance":
        return "text-blue-600 bg-blue-50";
      case "announcement":
        return "text-purple-600 bg-purple-50";
      case "update":
        return "text-green-600 bg-green-50";
      case "alert":
        return "text-red-600 bg-red-50";
      case "personal":
        return "text-orange-600 bg-orange-50";
      case "marketplace":
        return "text-indigo-600 bg-indigo-50";
      case "opportunities":
        return "text-cyan-600 bg-cyan-50";
      case "events":
        return "text-pink-600 bg-pink-50";
      case "confessions":
        return "text-rose-600 bg-rose-50";
      case "posts":
        return "text-amber-600 bg-amber-50";
      case "confession_like":
      case "confession_comment":
      case "blog_comment":
        return "text-emerald-600 bg-emerald-50";
      case "event_reminder":
        return "text-violet-600 bg-violet-50";
      case "application_update":
        return "text-sky-600 bg-sky-50";
      case "listing_sold":
        return "text-lime-600 bg-lime-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && hasToken()) {
      void fetchUnreadCount();
      void fetchNotifications();
    }
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate(notificationsRoute);
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-1rem))] sm:w-80">
        <DropdownMenuLabel className="flex flex-wrap items-center justify-between gap-2">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs h-6 px-2"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <ScrollArea className="h-[min(20rem,60vh)] sm:h-80">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 border-b last:border-b-0 hover:bg-muted/50 ${
                  !notification.is_read ? "bg-blue-50/50" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-1 rounded ${getNotificationColor(notification.type)}`}>
                    <span className="text-sm">{getNotificationIcon(notification.type)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{notification.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleMarkAsRead(notification.id)}
                            title="Mark as read"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleDeleteNotification(notification.id)}
                          title="Delete notification"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>

        {hasToken() && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={handleViewAll}>
                View all notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
