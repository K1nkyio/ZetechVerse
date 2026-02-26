import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, X, ArrowLeft, ExternalLink, MessageCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { notificationsApi, type Notification } from '@/api/notifications.api';
import PageHeader from '@/components/ui/page-header';
import { trackEvent } from '@/lib/analytics';

type ReadFilter = 'all' | 'unread' | 'read';
type ViewMode = 'timeline' | 'grouped';
type PriorityFilter = 'all' | 'high' | 'normal';

const HIGH_PRIORITY_TYPES = new Set([
  'alert',
  'maintenance',
  'application_update',
  'listing_sold',
  'event_reminder',
]);

const typeRouteMap: Record<string, string> = {
  marketplace: '/marketplace',
  opportunities: '/opportunities',
  events: '/events',
  confessions: '/confessions',
  posts: '/explore',
  confession_comment: '/confessions',
  blog_comment: '/explore',
  application_update: '/opportunities',
  listing_sold: '/marketplace',
};

const getPriority = (notification: Notification): 'high' | 'normal' =>
  HIGH_PRIORITY_TYPES.has(notification.type) ? 'high' : 'normal';

const getActionLabel = (notification: Notification): 'open' | 'reply' | 'approve' | null => {
  if (notification.type === 'confession_comment' || notification.type === 'blog_comment') return 'reply';
  if (notification.type === 'application_update' || notification.type === 'listing_sold') return 'approve';
  return typeRouteMap[notification.type] ? 'open' : null;
};

const Notifications = () => {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');

  useEffect(() => {
    if (!isAuthenticated) return;
    void fetchUnreadCount();
    void fetchNotifications();
  }, [isAuthenticated, readFilter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const result = await notificationsApi.getNotifications({
        limit: 80,
        is_read: readFilter === 'all' ? undefined : readFilter === 'read',
      });
      setNotifications(result.notifications || []);
      trackEvent('notifications_loaded', {
        count: (result.notifications || []).length,
        readFilter,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch notifications.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const result = await notificationsApi.getUnreadCount();
      setUnreadCount(result.unread_count || 0);
    } catch {
      // best effort
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to mark as read', variant: 'destructive' });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to mark all as read', variant: 'destructive' });
    }
  };

  const handleDeleteNotification = async (notificationId: number) => {
    const target = notifications.find((n) => n.id === notificationId);
    try {
      await notificationsApi.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (target && !target.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete notification', variant: 'destructive' });
    }
  };

  const openNotificationTarget = (notification: Notification) => {
    const base = typeRouteMap[notification.type];
    if (!base) {
      toast({ title: 'No linked content', description: 'This notification has no direct destination.' });
      return;
    }
    if (notification.related_id) {
      navigate(`${base}/${notification.related_id}`);
      return;
    }
    navigate(base);
  };

  const handleAction = async (notification: Notification) => {
    const action = getActionLabel(notification);
    if (!action) return;

    if (action === 'reply') {
      openNotificationTarget(notification);
      await handleMarkAsRead(notification.id);
      trackEvent('notification_reply_action', { id: notification.id, type: notification.type });
      return;
    }

    if (action === 'approve') {
      await handleMarkAsRead(notification.id);
      toast({ title: 'Approved', description: 'Notification acknowledged and marked as read.' });
      trackEvent('notification_approve_action', { id: notification.id, type: notification.type });
      return;
    }

    openNotificationTarget(notification);
    await handleMarkAsRead(notification.id);
    trackEvent('notification_open_action', { id: notification.id, type: notification.type });
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      if (priorityFilter === 'all') return true;
      return getPriority(notification) === priorityFilter;
    });
  }, [notifications, priorityFilter]);

  const groupedNotifications = useMemo(() => {
    return filteredNotifications.reduce<Record<string, Notification[]>>((acc, notification) => {
      const key = notification.type;
      if (!acc[key]) acc[key] = [];
      acc[key].push(notification);
      return acc;
    }, {});
  }, [filteredNotifications]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="text-center">Login required</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/login')} className="w-full">Go to login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-6">
      <div className="container mx-auto px-4 max-w-5xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <PageHeader
          title="Notifications"
          icon={<Bell className="h-6 w-6 text-primary" aria-hidden="true" />}
          description="Actionable, grouped updates with priority filtering."
          actions={
            unreadCount > 0 ? (
              <Badge variant="destructive">{unreadCount} unread</Badge>
            ) : undefined
          }
        />

        <Card className="mb-6">
          <CardContent className="p-4 flex flex-wrap gap-2">
            <Button variant={readFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setReadFilter('all')}>
              All
            </Button>
            <Button variant={readFilter === 'unread' ? 'default' : 'outline'} size="sm" onClick={() => setReadFilter('unread')}>
              Unread
            </Button>
            <Button variant={readFilter === 'read' ? 'default' : 'outline'} size="sm" onClick={() => setReadFilter('read')}>
              Read
            </Button>
            <Separator orientation="vertical" className="h-9 hidden sm:block" />
            <Button variant={viewMode === 'timeline' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('timeline')}>
              Timeline
            </Button>
            <Button variant={viewMode === 'grouped' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('grouped')}>
              Grouped
            </Button>
            <Separator orientation="vertical" className="h-9 hidden sm:block" />
            <Button variant={priorityFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setPriorityFilter('all')}>
              All Priorities
            </Button>
            <Button variant={priorityFilter === 'high' ? 'default' : 'outline'} size="sm" onClick={() => setPriorityFilter('high')}>
              High Priority
            </Button>
            <Button variant={priorityFilter === 'normal' ? 'default' : 'outline'} size="sm" onClick={() => setPriorityFilter('normal')}>
              Normal Priority
            </Button>
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={handleMarkAllAsRead} disabled={unreadCount === 0} className="gap-2">
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{filteredNotifications.length} notifications</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="rounded-lg border p-4">
                    <Skeleton className="h-4 w-40 mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-foreground/80 dark:text-foreground/90">No notifications in this view.</p>
              </div>
            ) : viewMode === 'timeline' ? (
              <div className="space-y-3">
                {filteredNotifications.map((notification) => (
                  <div key={notification.id} className={`p-4 rounded-lg border ${!notification.is_read ? 'bg-primary/5 border-primary/30' : 'bg-background'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm">{notification.title || notification.type}</p>
                          <Badge variant={getPriority(notification) === 'high' ? 'destructive' : 'secondary'}>
                            {getPriority(notification)}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground/80 dark:text-foreground/90 mb-2">{notification.message}</p>
                        <p className="text-xs text-foreground/65 dark:text-foreground/75">{new Date(notification.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {getActionLabel(notification) && (
                          <Button variant="outline" size="sm" onClick={() => void handleAction(notification)} className="gap-1">
                            {getActionLabel(notification) === 'reply' ? <MessageCircle className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                            {getActionLabel(notification) === 'reply'
                              ? 'Reply'
                              : getActionLabel(notification) === 'approve'
                              ? 'Approve'
                              : 'Open'}
                          </Button>
                        )}
                        {!notification.is_read && (
                          <Button variant="ghost" size="icon" onClick={() => void handleMarkAsRead(notification.id)} aria-label="Mark as read">
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => void handleDeleteNotification(notification.id)} aria-label="Delete notification">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedNotifications).map(([type, items]) => (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold capitalize">{type.replace('_', ' ')}</p>
                      <Badge variant="secondary">{items.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {items.map((notification) => (
                        <div key={notification.id} className={`p-3 rounded-lg border ${!notification.is_read ? 'bg-primary/5 border-primary/30' : 'bg-background'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium">{notification.title || type}</p>
                              <p className="text-sm text-foreground/80 dark:text-foreground/90">{notification.message}</p>
                              <p className="text-xs text-foreground/65 dark:text-foreground/75 mt-1">{new Date(notification.created_at).toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              {getActionLabel(notification) === 'approve' && (
                                <Button variant="outline" size="sm" onClick={() => void handleAction(notification)} className="gap-1">
                                  <ShieldCheck className="h-4 w-4" />
                                  Approve
                                </Button>
                              )}
                              {getActionLabel(notification) && getActionLabel(notification) !== 'approve' && (
                                <Button variant="outline" size="sm" onClick={() => void handleAction(notification)}>
                                  {getActionLabel(notification) === 'reply' ? 'Reply' : 'Open'}
                                </Button>
                              )}
                              {!notification.is_read && (
                                <Button variant="ghost" size="icon" onClick={() => void handleMarkAsRead(notification.id)} aria-label="Mark as read">
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => void handleDeleteNotification(notification.id)} aria-label="Delete notification">
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Notifications;
