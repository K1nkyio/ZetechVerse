import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart as RechartsBarChart,
  Bar,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calendar,
  ExternalLink,
  Heart,
  MessageCircle,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient, handleApiResponse } from "@/api/base";
import { useToast } from "@/hooks/use-toast";

type TimeRange = "7d" | "30d" | "90d";

interface AnalyticsPoint {
  date: string;
  newUsers?: number;
  activeUsers?: number;
  posts?: number;
  likes?: number;
  comments?: number;
}

interface AnalyticsAnomaly {
  id: string;
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  source: string;
  metric: string;
  date?: string;
  actionLabel: string;
}

interface DrilldownItem {
  id: string;
  title: string;
  subtitle?: string;
  metricLabel?: string;
  metricValue?: string | number;
  route?: string;
}

interface DrilldownGroup {
  key: string;
  label: string;
  items: DrilldownItem[];
}

interface DrilldownResponse {
  title: string;
  subtitle?: string;
  groups: DrilldownGroup[];
}

interface AnalyticsData {
  totalUsers: number;
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  activeUsers: number;
  weeklyGrowth: number;
  monthlyGrowth: number;
  engagementRate: number;
  topPosts: Array<{
    id: string;
    title: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    type: "blog";
  }>;
  topEvents: Array<{
    id: string;
    title: string;
    startDate?: string;
    status: string;
    views: number;
    likes: number;
    comments: number;
  }>;
  userActivity: AnalyticsPoint[];
  postTrends: AnalyticsPoint[];
  publishingTimeline: AnalyticsPoint[];
  engagementTimeline: AnalyticsPoint[];
  categoryDistribution: Array<{
    name: string;
    posts: number;
    percentage: number;
  }>;
  anomalies: AnalyticsAnomaly[];
  adminHealth: {
    inactiveAdmins14d: number;
    pendingAdminRequests: number;
  };
}

const analyticsApi = {
  getAnalytics: async (params: { range?: TimeRange } = {}) =>
    handleApiResponse(await apiClient.get<AnalyticsData>("/analytics", params)),
  getDrilldown: async (params: { source: string; metric: string; date?: string }) =>
    handleApiResponse(await apiClient.get<DrilldownResponse>("/analytics/drilldown", params)),
};

const formatCompactDate = (value?: string) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const ClickableDot = ({
  cx,
  cy,
  stroke,
  payload,
  onClick,
}: {
  cx?: number;
  cy?: number;
  stroke?: string;
  payload?: AnalyticsPoint;
  onClick?: (payload?: AnalyticsPoint) => void;
}) => {
  if (typeof cx !== "number" || typeof cy !== "number") return null;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={stroke || "currentColor"}
      stroke="hsl(var(--card))"
      strokeWidth={2}
      className="cursor-pointer transition-transform hover:scale-110"
      onClick={() => onClick?.(payload)}
    />
  );
};

export default function SuperAdminAnalytics() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldownData, setDrilldownData] = useState<DrilldownResponse | null>(null);

  useEffect(() => {
    void fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      setAnalyticsData(await analyticsApi.getAnalytics({ range: timeRange }));
    } catch (err: any) {
      console.error("Failed to fetch analytics data:", err);
      setError(err.message || "Failed to load analytics data.");
    } finally {
      setLoading(false);
    }
  };

  const openDrilldown = async (source: string, metric: string, date?: string) => {
    try {
      setDrilldownLoading(true);
      setDrilldownOpen(true);
      setDrilldownData(await analyticsApi.getDrilldown({ source, metric, date }));
    } catch (err: any) {
      setDrilldownOpen(false);
      toast({
        title: "Could not load drilldown",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDrilldownLoading(false);
    }
  };

  const keyMetrics = useMemo(() => {
    if (!analyticsData) return [];
    return [
      {
        title: "Total Users",
        value: analyticsData.totalUsers.toLocaleString(),
        hint: `+${analyticsData.weeklyGrowth}% this week`,
        icon: Users,
      },
      {
        title: "Published Posts",
        value: analyticsData.totalPosts.toLocaleString(),
        hint: `${analyticsData.activeUsers.toLocaleString()} active users in range`,
        icon: BarChart3,
      },
      {
        title: "Comments",
        value: analyticsData.totalComments.toLocaleString(),
        hint: `${analyticsData.engagementRate}% engagement rate`,
        icon: MessageCircle,
      },
      {
        title: "Likes",
        value: analyticsData.totalLikes.toLocaleString(),
        hint: `${analyticsData.adminHealth.inactiveAdmins14d} inactive admins`,
        icon: Heart,
      },
    ];
  }, [analyticsData]);

  if (loading) {
    return (
      <AdminLayout variant="super-admin">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Analytics</h1>
            <p className="text-muted-foreground">Turning platform signals into decisions.</p>
          </div>
          <Card className="admin-card">
            <CardContent className="py-16 text-center text-muted-foreground">
              Loading analytics...
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  if (!analyticsData) {
    return (
      <AdminLayout variant="super-admin">
        <Card className="admin-card">
          <CardContent className="py-12 text-center">
            <p className="text-destructive">{error || "Analytics are unavailable right now."}</p>
            <Button variant="outline" className="mt-4" onClick={() => void fetchAnalyticsData()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout variant="super-admin">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold font-display text-foreground">Actionable Analytics</h1>
            <p className="text-muted-foreground">
              Follow the spikes, inspect the affected users and content, and move straight into action.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
              <SelectTrigger className="w-full sm:w-40 bg-background/70">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => void fetchAnalyticsData()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {error ? (
          <Card className="admin-card border-destructive/40">
            <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {keyMetrics.map((metric) => (
            <Card key={metric.title} className="admin-card overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                    <p className="text-3xl font-bold font-display text-foreground">{metric.value}</p>
                    <p className="text-sm text-muted-foreground">{metric.hint}</p>
                  </div>
                  <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
                    <metric.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="admin-card border-primary/20 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.10),transparent_35%),linear-gradient(180deg,hsl(var(--card))_0%,hsl(var(--background))_100%)]">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-accent" />
              Anomaly Callouts
            </CardTitle>
            <CardDescription>
              High-signal changes worth investigating right away.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            {analyticsData.anomalies.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 p-5 text-sm text-muted-foreground">
                No major anomalies detected in the selected window.
              </div>
            ) : (
              analyticsData.anomalies.map((anomaly) => (
                <div key={anomaly.id} className="rounded-2xl border border-border/70 bg-background/75 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <Badge
                        variant="outline"
                        className={
                          anomaly.severity === "high"
                            ? "border-destructive/40 text-destructive"
                            : anomaly.severity === "medium"
                              ? "border-warning/40 text-warning"
                              : "border-primary/30 text-primary"
                        }
                      >
                        {anomaly.severity}
                      </Badge>
                      <h3 className="text-lg font-semibold font-display text-foreground">{anomaly.title}</h3>
                      <p className="text-sm text-muted-foreground">{anomaly.description}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void openDrilldown(anomaly.source, anomaly.metric, anomaly.date)}
                    >
                      {anomaly.actionLabel}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="admin-card">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                User Activity
              </CardTitle>
              <CardDescription>
                Click a dot to inspect the users behind that day.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={analyticsData.userActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatCompactDate} />
                  <YAxis />
                  <Tooltip labelFormatter={formatCompactDate} />
                  <Area
                    type="monotone"
                    dataKey="activeUsers"
                    stroke="#0284c7"
                    fill="#0284c7"
                    fillOpacity={0.18}
                    dot={(props: any) => (
                      <ClickableDot
                        {...props}
                        onClick={(payload) => void openDrilldown("userActivity", "activeUsers", payload?.date)}
                      />
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="newUsers"
                    stroke="#f97316"
                    fill="#f97316"
                    fillOpacity={0.16}
                    dot={(props: any) => (
                      <ClickableDot
                        {...props}
                        onClick={(payload) => void openDrilldown("userActivity", "newUsers", payload?.date)}
                      />
                    )}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="admin-card">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Publishing And Discussion
              </CardTitle>
              <CardDescription>
                Published-post spikes and comment spikes are both drillable.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={analyticsData.postTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatCompactDate} />
                  <YAxis />
                  <Tooltip labelFormatter={formatCompactDate} />
                  <Line
                    type="monotone"
                    dataKey="posts"
                    stroke="#7c3aed"
                    strokeWidth={2.5}
                    dot={(props: any) => (
                      <ClickableDot
                        {...props}
                        onClick={(payload) => void openDrilldown("publishing", "posts", payload?.date)}
                      />
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="comments"
                    stroke="#0ea5e9"
                    strokeWidth={2.5}
                    dot={(props: any) => (
                      <ClickableDot
                        {...props}
                        onClick={(payload) => void openDrilldown("engagement", "comments", payload?.date)}
                      />
                    )}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="admin-card">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Like Momentum
              </CardTitle>
              <CardDescription>
                Click a point to reveal the posts and events receiving likes that day.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData.engagementTimeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatCompactDate} />
                  <YAxis />
                  <Tooltip labelFormatter={formatCompactDate} />
                  <Line
                    type="monotone"
                    dataKey="likes"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    dot={(props: any) => (
                      <ClickableDot
                        {...props}
                        onClick={(payload) => void openDrilldown("engagement", "likes", payload?.date)}
                      />
                    )}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="admin-card">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Category Distribution
              </CardTitle>
              <CardDescription>Which editorial categories dominate the published mix.</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={analyticsData.categoryDistribution.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="posts" fill="#7c3aed" radius={[8, 8, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="admin-card">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="font-display flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Top Performing Posts
                </CardTitle>
                <CardDescription>Open a post directly from analytics.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {analyticsData.topPosts.map((post) => (
                <div key={post.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/70 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{post.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {post.views.toLocaleString()} views • {post.likes} likes • {post.comments} comments
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/super-admin/posts/${post.id}`)}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="admin-card">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Top Performing Events
              </CardTitle>
              <CardDescription>Jump into event detail pages from here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {analyticsData.topEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/70 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{event.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {event.status} • {event.views.toLocaleString()} views • {event.comments} comments
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/admin/events/${event.id}`)}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Dialog open={drilldownOpen} onOpenChange={setDrilldownOpen}>
          <DialogContent className="max-w-3xl bg-card">
            <DialogHeader>
              <DialogTitle className="font-display">
                {drilldownLoading ? "Loading details..." : drilldownData?.title || "Drilldown"}
              </DialogTitle>
              <DialogDescription>
                {drilldownLoading ? "Pulling the underlying records." : drilldownData?.subtitle}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto pr-1">
              {drilldownLoading ? (
                <div className="py-12 text-center text-muted-foreground">Loading drilldown data...</div>
              ) : drilldownData?.groups?.length ? (
                <div className="space-y-5">
                  {drilldownData.groups.map((group) => (
                    <div key={group.key} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-foreground">{group.label}</h3>
                        <Badge variant="outline">{group.items.length}</Badge>
                      </div>
                      {group.items.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                          No records matched this drilldown.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {group.items.map((item) => (
                            <div key={`${group.key}-${item.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/70 p-4">
                              <div className="min-w-0">
                                <p className="font-medium text-foreground">{item.title}</p>
                                {item.subtitle ? (
                                  <p className="mt-1 text-sm text-muted-foreground">{item.subtitle}</p>
                                ) : null}
                                {item.metricLabel ? (
                                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                    {item.metricLabel}: {item.metricValue}
                                  </p>
                                ) : null}
                              </div>
                              {item.route ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    navigate(item.route!);
                                    setDrilldownOpen(false);
                                  }}
                                >
                                  Open
                                </Button>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">No drilldown data available.</div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
