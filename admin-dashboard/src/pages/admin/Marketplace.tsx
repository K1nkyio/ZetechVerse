import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, Column } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Eye, Edit, Trash2, MoreHorizontal, PlusCircle, Search, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { marketplaceApi, type MarketplaceListing } from "@/api/marketplace.api";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminMarketplace() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<MarketplaceListing | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // Fetch data when filters change
  useEffect(() => {
    console.log('Marketplace useEffect triggered by filters, calling fetchListings');
    fetchListings();
  }, [statusFilter, conditionFilter, searchQuery, pagination.page]);

  // Always fetch data when component mounts (useful after navigation from create page)
  useEffect(() => {
    console.log('Marketplace component mounted/refreshed - fetching data');
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      console.log('Fetching marketplace listings with filters:', {
        page: pagination.page,
        limit: pagination.limit,
        statusFilter,
        conditionFilter,
        searchQuery
      });

      const filters: any = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery || undefined,
      };

      filters.status = statusFilter;

      if (conditionFilter !== "all") {
        filters.condition = conditionFilter;
      }

      console.log('API call filters:', filters);
      const response = await marketplaceApi.getListings(filters);
      console.log('API response:', response);

      setListings(response.listings);
      setPagination(response.pagination);
      console.log('Set listings:', response.listings.length, 'items');
    } catch (error: any) {
      console.error('Failed to load marketplace listings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load listings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!listingToDelete) return;

    try {
      await marketplaceApi.deleteListing(listingToDelete.id);
      toast({
        title: "Success",
        description: "Listing deleted successfully",
      });
      setDeleteDialogOpen(false);
      setListingToDelete(null);
      fetchListings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete listing",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (listing: MarketplaceListing) => {
    return <StatusBadge status={listing.status} />;
  };

  const columns: Column<MarketplaceListing>[] = [
    {
      key: "title",
      header: "Title",
      render: (listing) => (
        <div className="max-w-xs">
          <p className="font-medium text-foreground truncate">{listing.title}</p>
          <p className="text-xs text-muted-foreground">
            {listing.seller_full_name} • {listing.views_count} views
          </p>
        </div>
      ),
    },
    {
      key: "price",
      header: "Price",
      render: (listing) => (
        <div className="flex items-center gap-1">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{listing.price.toLocaleString()}</span>
          {listing.is_negotiable && (
            <Badge variant="outline" className="text-xs">Negotiable</Badge>
          )}
        </div>
      ),
    },
    {
      key: "condition",
      header: "Condition",
      render: (listing) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
          {listing.condition}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (listing) => getStatusBadge(listing),
    },
    {
      key: "location",
      header: "Location",
      render: (listing) => (
        <span className="text-muted-foreground">
          {listing.location || "N/A"}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      render: (listing) => (
        <span className="text-muted-foreground">
          {new Date(listing.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (listing) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem onClick={() => navigate(`/admin/marketplace/${listing.id}`)}>
              <Eye className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/admin/marketplace/${listing.id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setListingToDelete(listing);
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

  const filteredListings = listings.filter((listing) => {
    if (statusFilter !== "all" && listing.status !== statusFilter) {
      return false;
    }
    if (conditionFilter !== "all" && listing.condition !== conditionFilter) {
      return false;
    }
    return true;
  });

  return (
    <AdminLayout variant="admin">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Marketplace</h1>
            <p className="text-muted-foreground">Manage marketplace listings</p>
          </div>
          <Button
            onClick={() => navigate("/admin/marketplace/create")}
            className="gradient-primary text-primary-foreground"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Listing
          </Button>
        </div>

        {/* Filters */}
        <Card className="admin-card">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search listings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background"
                />
              </div>
              <div className="w-48">
                <Select value={conditionFilter} onValueChange={setConditionFilter}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Filter by condition" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">All Conditions</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="used">Used</SelectItem>
                    <SelectItem value="refurbished">Refurbished</SelectItem>
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
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
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
              All Listings ({loading ? "..." : filteredListings.length})
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
                data={filteredListings}
                columns={columns}
                searchKey="title"
                searchPlaceholder="Search listings..."
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
                This will permanently delete the listing "{listingToDelete?.title}". This action cannot be undone.
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

