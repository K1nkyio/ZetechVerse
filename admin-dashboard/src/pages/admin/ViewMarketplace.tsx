import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { marketplaceApi, type MarketplaceListing } from "@/api/marketplace.api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, ArrowLeft, MapPin, Calendar, DollarSign, User, Eye } from "lucide-react";

export default function AdminViewMarketplace() {
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

  if (loading) {
    return (
      <AdminLayout variant="admin">
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-64" />
          </div>
          <Card className="admin-card">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/marketplace")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-display text-foreground">{listing.title}</h1>
              <p className="text-muted-foreground">View listing details</p>
            </div>
          </div>
          <Button onClick={() => navigate(`/admin/marketplace/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            {listing.image_urls && listing.image_urls.length > 0 && (
              <Card className="admin-card">
                <CardHeader>
                  <CardTitle>Images</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {listing.image_urls.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`${listing.title} - Image ${index + 1}`}
                        className="w-full h-32 object-cover rounded border"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder-image.jpg";
                        }}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Details */}
            <Card className="admin-card">
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Description</p>
                  <p className="text-foreground whitespace-pre-wrap">{listing.description}</p>
                </div>

                {listing.tags && listing.tags.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {listing.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Status & Info */}
            <Card className="admin-card">
              <CardHeader>
                <CardTitle>Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <StatusBadge status={listing.status} />
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Condition</p>
                  <Badge variant="outline" className="capitalize">{listing.condition}</Badge>
                </div>

                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-bold text-lg">{listing.price.toLocaleString()} KES</span>
                  {listing.is_negotiable && (
                    <Badge variant="secondary" className="text-xs">Negotiable</Badge>
                  )}
                </div>

                {listing.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{listing.location}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{listing.seller_full_name}</span>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Contact Method</p>
                  <Badge variant="outline" className="capitalize">{listing.contact_method.replace('_', ' ')}</Badge>
                </div>

                {listing.urgent && (
                  <Badge variant="destructive">Urgent</Badge>
                )}
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card className="admin-card">
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Views</span>
                  <span className="font-medium">{listing.views_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">
                    {new Date(listing.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span className="font-medium">
                    {new Date(listing.updated_at).toLocaleDateString()}
                  </span>
                </div>
                {listing.expires_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expires</span>
                    <span className="font-medium">
                      {new Date(listing.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

