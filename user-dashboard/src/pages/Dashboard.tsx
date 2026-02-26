import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PageHeader from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, ShoppingBag, Briefcase, Calendar, MessageCircle, ArrowRight } from 'lucide-react';
import { notificationsApi } from '@/api/notifications.api';
import { trackEvent } from '@/lib/analytics';

const Dashboard = () => {
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await notificationsApi.getUnreadCount();
        setUnreadCount(result.unread_count || 0);
      } catch {
        setUnreadCount(0);
      }
    };
    void load();
    trackEvent('dashboard_opened');
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="container mx-auto px-4 py-8">
        <PageHeader
          title="Dashboard"
          icon={<MessageCircle className="h-6 w-6 text-primary" aria-hidden="true" />}
          description="Your shortcuts, alerts, and community activity in one place."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium inline-flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {unreadCount === null ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-bold">{unreadCount}</p>
              )}
              <p className="text-xs text-muted-foreground">Unread updates</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium inline-flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-primary" />
                Marketplace
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Continue browsing campus listings.</p>
              <Button asChild variant="outline" size="sm">
                <Link to="/marketplace">Open</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium inline-flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Track new jobs and internships.</p>
              <Button asChild variant="outline" size="sm">
                <Link to="/opportunities">Open</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium inline-flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Check upcoming campus events.</p>
              <Button asChild variant="outline" size="sm">
                <Link to="/events">Open</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild><Link to="/confessions">View Confessions</Link></Button>
            <Button asChild variant="outline"><Link to="/notifications">Manage Notifications</Link></Button>
            <Button asChild variant="outline"><Link to="/profile">Edit Profile</Link></Button>
            <Button asChild variant="outline"><Link to="/search">Search Content</Link></Button>
            <Button asChild variant="ghost" className="gap-2"><Link to="/">Go to Home <ArrowRight className="h-4 w-4" /></Link></Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
