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
import { Eye, Edit, Trash2, MoreHorizontal, CheckCircle, XCircle, Flag, Star, Search, User, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { confessionsApi, type Confession } from "@/api/confessions.api";
import type { ConfessionStats } from "@/types/confession";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function SuperAdminConfessions() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confessionToDelete, setConfessionToDelete] = useState<Confession | null>(null);
  const [stats, setStats] = useState<ConfessionStats | null>(null);
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

      if (statusFilter !== "all") {
        filters.status = statusFilter;
      }

      const response = await confessionsApi.getConfessions(filters);
      const statsResponse = await confessionsApi.getConfessionStats();
      // Filter out any undefined items from the confessions array
      const validConfessions = response.confessions.filter(confession => confession && confession.id);
      setConfessions(validConfessions);
      setPagination(response.pagination);
      setStats(statsResponse);
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
    try {
      let updatedConfession: Confession;

      switch (action) {
        case 'approve':
          updatedConfession = await confessionsApi.approveConfession(confession.id);
          toast({
            title: "Approved",
            description: "Confession has been approved and published",
          });
          break;
        case 'reject':
          updatedConfession = await confessionsApi.rejectConfession(confession.id, "Content violation");
          toast({
            title: "Rejected",
            description: "Confession has been rejected",
          });
          break;
        case 'flag':
          updatedConfession = await confessionsApi.flagConfession(confession.id);
          toast({
            title: "Flagged",
            description: "Confession has been flagged for review",
          });
          break;
        case 'hot':
          updatedConfession = await confessionsApi.markAsHot(confession.id, !confession.is_hot);
          toast({
            title: confession.is_hot ? "Unmarked" : "Marked Hot",
            description: `Confession ${confession.is_hot ? 'removed from' : 'added to'} hot confessions`,
          });
          break;
        default:
          return;
      }

      // Update the confession in the list
      setConfessions(prev =>
        prev.filter(c => c && c.id).map(c => c.id === confession.id ? updatedConfession : c)
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to moderate confession",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!confessionToDelete) return;

    try {
      await confessionsApi.deleteConfession(confessionToDelete.id);
      toast({
        title: "Success",
        description: "Confession deleted successfully",
      });
      setDeleteDialogOpen(false);
      setConfessionToDelete(null);
      fetchConfessions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete confession",
        variant: "destructive",
      });
    }
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
            {confession.auto_flagged && (
              <Badge variant="outline" className="text-xs">Auto-flagged</Badge>
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
      key: "risk",
      header: "Risk",
      render: (confession) => (
        <div className="space-y-1">
          <Badge variant={confession.risk_level === 'high' ? 'destructive' : confession.risk_level === 'medium' ? 'secondary' : 'outline'} className="capitalize">
            {confession.risk_level || 'low'}
          </Badge>
          <div className="text-xs text-muted-foreground">
            Abuse {Number(confession.abuse_score || 0).toFixed(0)}
          </div>
        </div>
      ),
    },
    {
      key: "reports",
      header: "Reports",
      render: (confession) => (
        <div className="text-sm font-medium">{confession.report_count || 0}</div>
      ),
    },
    {
      key: "created_at",
      header: "Posted",
      render: (confession) => (
        <div className="text-sm text-muted-foreground">
          {new Date(confession.created_at).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: "reactions_count",
      header: "Reactions",
      render: (confession) => (
        <div className="text-sm font-medium">{confession.reactions_count || 0}</div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (confession) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/super-admin/confessions/${confession.id}`)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>

            {confession.status === 'pending' && (
              <>
                <DropdownMenuItem
                  onClick={() => handleModerate('approve', confession)}
                  className="text-green-600"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleModerate('reject', confession)}
                  className="text-red-600"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </DropdownMenuItem>
              </>
            )}

            {confession.status === 'approved' && (
              <DropdownMenuItem
                onClick={() => handleModerate('hot', confession)}
                className={confession.is_hot ? "text-orange-600" : "text-yellow-600"}
              >
                <Star className="mr-2 h-4 w-4" />
                {confession.is_hot ? 'Unmark Hot' : 'Mark as Hot'}
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              onClick={() => handleModerate('flag', confession)}
              className="text-orange-600"
            >
              <Flag className="mr-2 h-4 w-4" />
              Flag
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                setConfessionToDelete(confession);
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

  const filteredConfessions = (confessions || []).filter((confession) => {
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
    <AdminLayout variant="super-admin">
        <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="admin-card">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Pending approvals</div>
              <div className="text-2xl font-bold mt-2">{stats?.pending_approvals || 0}</div>
            </CardContent>
          </Card>
          <Card className="admin-card">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">High-risk confessions</div>
              <div className="text-2xl font-bold mt-2">{stats?.high_risk_confessions || 0}</div>
            </CardContent>
          </Card>
          <Card className="admin-card">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Community reports</div>
              <div className="text-2xl font-bold mt-2">{stats?.total_reports || 0}</div>
            </CardContent>
          </Card>
          <Card className="admin-card">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Average abuse score</div>
              <div className="text-2xl font-bold mt-2">{stats?.average_abuse_score || 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Moderate Confessions</h1>
            <p className="text-muted-foreground">Review and moderate anonymous confessions from students</p>
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

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="admin-card">
          <CardContent className="pt-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-4 p-4">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <DataTable columns={columns} data={filteredConfessions} />
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                    {pagination.total} confessions
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                      disabled={pagination.page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(p => ({ ...p, page: Math.min(p.pages, p.page + 1) }))}
                      disabled={pagination.page === pagination.pages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Confession</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this confession? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
