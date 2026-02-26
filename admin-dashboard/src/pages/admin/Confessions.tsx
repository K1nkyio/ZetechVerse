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
import { Eye, MoreHorizontal, Search, User, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { confessionsApi, type Confession } from "@/api/confessions.api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function AdminConfessions() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    fetchConfessions();
  }, [statusFilter, searchQuery, pagination.page]);

  const fetchConfessions = async () => {
    try {
      setLoading(true);
      const filters: any = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery || undefined,
      };

      // For admin dashboard, show only approved, pending, and rejected confessions (read-only view)
      if (statusFilter !== "all") {
        filters.status = statusFilter;
      }

      const response = await confessionsApi.getConfessions(filters);
      // Filter out any undefined items from the confessions array
      const validConfessions = response.confessions.filter(confession => confession && confession.id);
      setConfessions(validConfessions);
      setPagination(response.pagination);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load confessions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleModerate = async (action: string, confession: Confession) => {
    // This method is intentionally disabled for admin users
    toast({
      title: "Access Denied",
      description: "Only Super Admins can moderate confessions. This is a read-only view for admins.",
      variant: "destructive",
    });
  };

  const handleDelete = async () => {
    // This method is intentionally disabled for admin users
    toast({
      title: "Access Denied",
      description: "Only Super Admins can delete confessions.",
      variant: "destructive",
    });
  };

  const getStatusBadge = (confession: Confession) => {
    return <StatusBadge status={confession.status} />;
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  const columns: Column<Confession>[] = [
    {
      key: "content",
      header: "Confession",
      render: (confession) => (
        <div className="max-w-xs">
          <p className="font-medium text-foreground">
            {truncateContent(confession.content)}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {confession.is_anonymous ? (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                Anonymous
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <UserCheck className="h-3 w-3" />
                {confession.author_username || "Unknown"}
              </div>
            )}
            {confession.is_hot && (
              <Badge variant="destructive" className="text-xs">Hot</Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (confession) => getStatusBadge(confession),
    },
    {
      key: "engagement",
      header: "Engagement",
      render: (confession) => (
        <div className="text-sm text-muted-foreground">
          <div>❤️ {confession.likes_count}</div>
          <div>💬 {confession.comments_count}</div>
          <div>🔗 {confession.shares_count}</div>
        </div>
      ),
    },
    {
      key: "moderated_by",
      header: "Moderated By",
      render: (confession) => (
        <div className="text-sm text-muted-foreground">
          {confession.moderated_by_username ? (
            <span>{confession.moderated_by_username}</span>
          ) : (
            <span className="text-xs">Not moderated</span>
          )}
          {confession.moderated_at && (
            <div className="text-xs">
              {new Date(confession.moderated_at).toLocaleDateString()}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      render: (confession) => (
        <span className="text-muted-foreground text-sm">
          {new Date(confession.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (confession) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem onClick={() => navigate(`/admin/confessions/${confession.id}`)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>

            {/* Admin users cannot moderate confessions - this is read-only view */}
            <DropdownMenuItem disabled>
              <span className="text-xs italic text-muted-foreground">Moderation locked for admins</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const filteredConfessions = (confessions || []).filter((confession) => {
    // Skip undefined/null confessions
    if (!confession || typeof confession !== 'object') {
      return false;
    }
    if (statusFilter !== "all" && confession.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const pendingCount = (confessions || []).filter(c => c && c.status === 'pending').length;

  return (
    <AdminLayout variant="admin">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Confessions</h1>
            <p className="text-muted-foreground">View confessions - moderation is restricted to Super Admins</p>
            {pendingCount > 0 && (
              <div className="mt-2">
                <Badge variant="secondary" className="text-sm">
                  {pendingCount} pending approval
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card className="admin-card">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search confessions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background"
                />
              </div>
              <div className="w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
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
              All Confessions ({loading ? "..." : filteredConfessions.length})
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
                data={filteredConfessions}
                columns={columns}
                searchKey="content"
                searchPlaceholder="Search confessions..."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

