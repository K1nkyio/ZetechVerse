import { useState, useEffect } from "react";
import { Bell, X, Check, CheckCheck, Calendar, ShoppingCart, Briefcase, Megaphone, Newspaper, User, Heart, AlertTriangle, Star, Zap } from "lucide-react";
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
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
import { notificationsApi, type Notification } from "@/api/notifications.api";
import { trackEvent } from "@/lib/analytics";
import { useIsMobile } from "@/hooks/use-mobile";

const NAV_BADGE_CLASS =
  'absolute -top-1 -right-1 h-5 min-w-[1.25rem] rounded-full px-1 flex items-center justify-center text-[10px] font-semibold ring-2 ring-background';
const NAV_DOT_CLASS =
  'absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background';

export function NotificationBell() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const dropdownAlign = isMobile ? "center" : "end";

  useEffect(() => {
    // Only fetch notifications if user is authenticated
    if (isAuthenticated) {
      fetchUnreadCount();
      fetchNotifications();
      
      // Poll for new notifications every 30 seconds
      const interval = setInterval(() => {
        fetchUnreadCount();
        fetchNotifications();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const fetchUnreadCount = async () => {
    try {
      const result = await notificationsApi.getUnreadCount();
      setUnreadCount(result.unread_count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const result = await notificationsApi.getNotifications({ limit: 10 });
      setNotifications(result.notifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
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
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
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
      case 'system':
      case 'maintenance':
        return <Zap className="h-4 w-4" />;
      case 'announcement':
        return <Megaphone className="h-4 w-4" />;
      case 'update':
        return <Star className="h-4 w-4" />;
      case 'alert':
        return <AlertTriangle className="h-4 w-4" />;
      case 'personal':
        return <User className="h-4 w-4" />;
      case 'marketplace':
        return <ShoppingCart className="h-4 w-4" />;
      case 'opportunities':
        return <Briefcase className="h-4 w-4" />;
      case 'events':
        return <Calendar className="h-4 w-4" />;
      case 'confessions':
        return <Heart className="h-4 w-4" />;
      case 'posts':
        return <Newspaper className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'system':
      case 'maintenance':
        return 'text-blue-600 bg-blue-50';
      case 'announcement':
        return 'text-purple-600 bg-purple-50';
      case 'update':
        return 'text-green-600 bg-green-50';
      case 'alert':
        return 'text-red-600 bg-red-50';
      case 'personal':
        return 'text-orange-600 bg-orange-50';
      case 'marketplace':
        return 'text-indigo-600 bg-indigo-50';
      case 'opportunities':
        return 'text-cyan-600 bg-cyan-50';
      case 'events':
        return 'text-pink-600 bg-pink-50';
      case 'confessions':
        return 'text-rose-600 bg-rose-50';
      case 'posts':
        return 'text-amber-600 bg-amber-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getNotificationTitle = (type: string) => {
    switch (type) {
      case 'marketplace':
        return 'New Marketplace Item';
      case 'opportunities':
        return 'New Opportunity';
      case 'events':
        return 'New Event';
      case 'confessions':
        return 'New Confession';
      case 'posts':
        return 'New Post';
      default:
        return '';
    }
  };

  const typeRouteMap: Record<string, { list: string; detail?: string }> = {
    marketplace: { list: '/marketplace', detail: '/marketplace' },
    opportunities: { list: '/opportunities', detail: '/opportunities' },
    events: { list: '/events', detail: '/events' },
    confessions: { list: '/confessions' },
    posts: { list: '/explore', detail: '/blog' },
    confession_comment: { list: '/confessions' },
    blog_comment: { list: '/explore', detail: '/blog' },
    application_update: { list: '/opportunities', detail: '/opportunities' },
    listing_sold: { list: '/marketplace', detail: '/marketplace' }
  };

  const openNotification = async (notification: Notification) => {
    const route = typeRouteMap[notification.type];
    if (!route) return;

    setOpen(false);
    if (notification.related_id && route.detail) {
      navigate(`${route.detail}/${notification.related_id}`);
    } else {
      navigate(route.list);
    }
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }
    trackEvent('notification_bell_open', { type: notification.type, id: notification.id });
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && isAuthenticated) {
      void fetchUnreadCount();
      void fetchNotifications();
    }
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate('/notifications');
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && unreadCount < 10 && (
            <>
              <span className={NAV_DOT_CLASS} />
              <span className="sr-only">{`${unreadCount} unread notifications`}</span>
            </>
          )}
          {unreadCount >= 10 && (
            <Badge variant="destructive" className={NAV_BADGE_CLASS}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={dropdownAlign} collisionPadding={8} className="w-[min(22rem,calc(100vw-1rem))] sm:w-80">
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
          {!isAuthenticated ? (
            <div className="p-4 text-center text-sm text-foreground/75 dark:text-foreground/85">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Please log in to view notifications</p>
            </div>
          ) : loading ? (
            <div className="p-4 text-center text-sm text-foreground/75 dark:text-foreground/85">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-foreground/75 dark:text-foreground/85">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 border-b last:border-b-0 hover:bg-muted/50 ${
                  !notification.is_read ? 'bg-primary/10 dark:bg-primary/20' : ''
                } ${typeRouteMap[notification.type] ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  if (typeRouteMap[notification.type]) {
                    void openNotification(notification);
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-1 rounded ${getNotificationColor(notification.type)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {notification.title || getNotificationTitle(notification.type)}
                        </p>
                        <p className="text-xs text-foreground/80 dark:text-foreground/90 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-foreground/65 dark:text-foreground/75 mt-1">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleMarkAsRead(notification.id);
                            }}
                            title="Mark as read"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDeleteNotification(notification.id);
                          }}
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

        {isAuthenticated && (
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
