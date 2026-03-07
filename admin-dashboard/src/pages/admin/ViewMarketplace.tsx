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

const parseObjectish = (value: unknown): Record<string, any> => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const normalizeServiceDetails = (value: unknown) => {
  const source = parseObjectish(value);
  return {
    pricing_model: source.pricing_model || source.pricingModel,
    service_area: source.service_area || source.serviceArea,
    availability: source.availability,
  };
};

const normalizeHostelDetails = (value: unknown) => {
  const source = parseObjectish(value);
  return {
    room_type: source.room_type || source.roomType,
    beds_available: source.beds_available ?? source.bedsAvailable,
    gender_policy: source.gender_policy || source.genderPolicy,
    amenities: Array.isArray(source.amenities) ? source.amenities : [],
  };
};

const getEffectiveListingKind = (listing: MarketplaceListing): "product" | "service" | "hostel" => {
  const rawKind = String(listing.listing_kind || "").toLowerCase();
  if (rawKind === "service" || rawKind === "hostel") return rawKind;

  const serviceDetails = normalizeServiceDetails(listing.service_details);
  const hostelDetails = normalizeHostelDetails(listing.hostel_details);

  const hasServiceDetails = Boolean(
    serviceDetails.pricing_model ||
    serviceDetails.service_area ||
    serviceDetails.availability
  );
  const hasHostelDetails = Boolean(
    hostelDetails.room_type ||
    Number(hostelDetails.beds_available ?? 0) > 0 ||
    hostelDetails.gender_policy ||
    (Array.isArray(hostelDetails.amenities) && hostelDetails.amenities.length > 0)
  );

  if (hasHostelDetails) return "hostel";
  if (hasServiceDetails) return "service";

  const categoryText = `${listing.category_name || ""} ${listing.category_slug || ""}`.toLowerCase();
  if (categoryText.includes("hostel")) return "hostel";
  if (categoryText.includes("service")) return "service";

  return "product";
};

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

  const listingKind = getEffectiveListingKind(listing);
  const serviceDetails = normalizeServiceDetails(listing.service_details);
  const hostelDetails = normalizeHostelDetails(listing.hostel_details);

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
                  <p className="text-sm text-muted-foreground mb-1">Listing Type</p>
                  <Badge variant="outline" className="capitalize">{listingKind}</Badge>
                </div>

                {listingKind === "product" && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Condition</p>
                    <Badge variant="outline" className="capitalize">{listing.condition || "N/A"}</Badge>
                  </div>
                )}

                {listingKind === "service" && serviceDetails.pricing_model && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Pricing Model</p>
                    <Badge variant="secondary" className="capitalize">
                      {String(serviceDetails.pricing_model).replace("_", " ")}
                    </Badge>
                  </div>
                )}

                {listingKind === "hostel" && hostelDetails.room_type && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Room Type</p>
                    <Badge variant="secondary" className="capitalize">{hostelDetails.room_type}</Badge>
                  </div>
                )}

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

                {listingKind === "service" && serviceDetails.service_area && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Service Area</p>
                    <p className="text-foreground">{serviceDetails.service_area}</p>
                  </div>
                )}

                {listingKind === "service" && serviceDetails.availability && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Availability</p>
                    <p className="text-foreground">{serviceDetails.availability}</p>
                  </div>
                )}

                {listingKind === "hostel" && (
                  <div className="space-y-2">
                    {hostelDetails.beds_available !== undefined && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Beds Available</p>
                        <p className="text-foreground">{hostelDetails.beds_available}</p>
                      </div>
                    )}
                    {hostelDetails.gender_policy && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Gender Policy</p>
                        <p className="text-foreground capitalize">{hostelDetails.gender_policy}</p>
                      </div>
                    )}
                    {hostelDetails.amenities && hostelDetails.amenities.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Amenities</p>
                        <div className="flex flex-wrap gap-2">
                          {hostelDetails.amenities.map((amenity, index) => (
                            <Badge key={index} variant="secondary">{amenity}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
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
