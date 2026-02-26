import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { MarketplaceForm } from "@/components/admin/MarketplaceForm";
import { marketplaceApi, type MarketplaceListing, type CreateMarketplaceListingData } from "@/api/marketplace.api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminEditMarketplace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchListing();
    }
  }, [id]);

  const fetchListing = async () => {
    try {
      setLoading(true);
      const data = await marketplaceApi.getListing(parseInt(id!));
      setListing(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load listing",
        variant: "destructive",
      });
      navigate("/admin/marketplace");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: CreateMarketplaceListingData) => {
    if (!id) return;
    await marketplaceApi.updateListing(parseInt(id), data);
    navigate("/admin/marketplace");
  };

  if (loading) {
    return (
      <AdminLayout variant="admin">
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Card className="admin-card">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  if (!listing) {
    return (
      <AdminLayout variant="admin">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Listing Not Found</h1>
            <p className="text-muted-foreground">The listing you're looking for doesn't exist.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout variant="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Edit Marketplace Listing</h1>
          <p className="text-muted-foreground">Update listing details</p>
        </div>

        <MarketplaceForm
          initialData={listing}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/admin/marketplace")}
          isEditing={true}
        />
      </div>
    </AdminLayout>
  );
}

