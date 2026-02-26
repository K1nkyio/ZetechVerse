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
import { Eye, Edit, Trash2, MoreHorizontal, PlusCircle, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { opportunitiesApi, type Opportunity } from "@/api/opportunities.api";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminOpportunities() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [opportunityToDelete, setOpportunityToDelete] = useState<Opportunity | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // Fetch data when filters change
  useEffect(() => {
    console.log('Opportunities useEffect triggered by filters, calling fetchOpportunities');
    fetchOpportunities();
  }, [statusFilter, typeFilter, searchQuery, pagination.page]);

  // Always fetch data when component mounts (useful after navigation from create page)
  useEffect(() => {
    console.log('Opportunities component mounted/refreshed - fetching data');
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      console.log('Fetching opportunities with filters:', {
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
      const response = await opportunitiesApi.getOpportunities(filters);
      console.log('API response:', response);

      setOpportunities(response.opportunities);
      setPagination(response.pagination);
      console.log('Set opportunities:', response.opportunities.length, 'items');
    } catch (error: any) {
      console.error('Failed to load opportunities:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load opportunities",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!opportunityToDelete) return;

    try {
      await opportunitiesApi.deleteOpportunity(opportunityToDelete.id);
      toast({
        title: "Success",
        description: "Opportunity deleted successfully",
      });
      setDeleteDialogOpen(false);
      setOpportunityToDelete(null);
      fetchOpportunities();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete opportunity",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (opportunity: Opportunity) => {
    if (opportunity.is_expired) {
      return <StatusBadge status="expired" />;
    }
    return <StatusBadge status={opportunity.status} />;
  };

  const columns: Column<Opportunity>[] = [
    {
      key: "title",
      header: "Title",
      render: (opp) => (
        <div className="max-w-xs">
          <p className="font-medium text-foreground truncate">{opp.title}</p>
          <p className="text-xs text-muted-foreground">
            {opp.company} • {opp.views_count} views
          </p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (opp) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
          {opp.type}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (opp) => getStatusBadge(opp),
    },
    {
      key: "deadline",
      header: "Deadline",
      render: (opp) => (
        <span className="text-muted-foreground">
          {opp.application_deadline 
            ? new Date(opp.application_deadline).toLocaleDateString()
            : "N/A"}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      render: (opp) => (
        <span className="text-muted-foreground">
          {new Date(opp.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (opp) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem onClick={() => navigate(`/admin/opportunities/${opp.id}`)}>
              <Eye className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/admin/opportunities/${opp.id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setOpportunityToDelete(opp);
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

  const filteredOpportunities = opportunities.filter((opp) => {
    if (statusFilter !== "all" && opp.status !== statusFilter && !(statusFilter === "expired" && opp.is_expired)) {
      return false;
    }
    if (typeFilter !== "all" && opp.type !== typeFilter) {
      return false;
    }
    return true;
  });

  return (
    <AdminLayout variant="admin">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Opportunities</h1>
            <p className="text-muted-foreground">Manage job opportunities, internships, and more</p>
          </div>
          <Button
            onClick={() => navigate("/admin/opportunities/create")}
            className="gradient-primary text-primary-foreground"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Opportunity
          </Button>
        </div>

        {/* Filters */}
        <Card className="admin-card">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search opportunities..."
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
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="attachment">Attachment</SelectItem>
                    <SelectItem value="job">Job</SelectItem>
                    <SelectItem value="scholarship">Scholarship</SelectItem>
                    <SelectItem value="volunteer">Volunteer</SelectItem>
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="filled">Filled</SelectItem>
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
              All Opportunities ({loading ? "..." : filteredOpportunities.length})
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
                data={filteredOpportunities}
                columns={columns}
                searchKey="title"
                searchPlaceholder="Search opportunities..."
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
                This will permanently delete the opportunity "{opportunityToDelete?.title}". This action cannot be undone.
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

