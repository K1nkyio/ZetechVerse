import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { opportunitiesApi, type Opportunity } from "@/api/opportunities.api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit, ArrowLeft, MapPin, Calendar, DollarSign, Mail, Phone, ExternalLink, Building2 } from "lucide-react";

export default function AdminViewOpportunity() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchOpportunity();
    }
  }, [id]);

  const fetchOpportunity = async () => {
    try {
      setLoading(true);
      const data = await opportunitiesApi.getOpportunity(parseInt(id!));
      setOpportunity(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load opportunity",
        variant: "destructive",
      });
      navigate("/admin/opportunities");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout variant="admin">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
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

  if (!opportunity) {
    return (
      <AdminLayout variant="admin">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Opportunity Not Found</h1>
            <p className="text-muted-foreground">The opportunity you're looking for doesn't exist.</p>
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
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/opportunities")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-display text-foreground">{opportunity.title}</h1>
              <p className="text-muted-foreground">View opportunity details</p>
            </div>
          </div>
          <Button onClick={() => navigate(`/admin/opportunities/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card className="admin-card">
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Description</p>
                  <p className="text-foreground whitespace-pre-wrap">{opportunity.description}</p>
                </div>

                {opportunity.requirements && opportunity.requirements.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Requirements</p>
                    <ul className="list-disc list-inside space-y-1">
                      {opportunity.requirements.map((req, index) => (
                        <li key={index} className="text-foreground">{req}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {opportunity.benefits && opportunity.benefits.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Benefits</p>
                    <div className="flex flex-wrap gap-2">
                      {opportunity.benefits.map((benefit, index) => (
                        <Badge key={index} variant="secondary">{benefit}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {opportunity.responsibilities && opportunity.responsibilities.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Responsibilities</p>
                    <ul className="list-disc list-inside space-y-1">
                      {opportunity.responsibilities.map((responsibility, index) => (
                        <li key={index} className="text-foreground">{responsibility}</li>
                      ))}
                    </ul>
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
                  {opportunity.is_expired ? (
                    <StatusBadge status="expired" />
                  ) : (
                    <StatusBadge status={opportunity.status} />
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Type</p>
                  <Badge variant="outline" className="capitalize">{opportunity.type}</Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{opportunity.company}</span>
                </div>

                {opportunity.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{opportunity.location}</span>
                  </div>
                )}

                {opportunity.application_deadline && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      Deadline: {new Date(opportunity.application_deadline).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {opportunity.is_paid && (opportunity.salary_min || opportunity.salary_max) && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {opportunity.salary_min && opportunity.salary_max
                        ? `${opportunity.currency} ${opportunity.salary_min.toLocaleString()} - ${opportunity.salary_max.toLocaleString()}`
                        : opportunity.salary_min
                        ? `${opportunity.currency} ${opportunity.salary_min.toLocaleString()}+`
                        : `${opportunity.currency} Up to ${opportunity.salary_max?.toLocaleString()}`}
                    </span>
                  </div>
                )}

                {opportunity.contact_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${opportunity.contact_email}`} className="text-primary hover:underline">
                      {opportunity.contact_email}
                    </a>
                  </div>
                )}

                {opportunity.contact_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${opportunity.contact_phone}`} className="text-primary hover:underline">
                      {opportunity.contact_phone}
                    </a>
                  </div>
                )}

                {opportunity.application_url && (
                  <div>
                    <Button asChild className="w-full">
                      <a href={opportunity.application_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Apply Now
                      </a>
                    </Button>
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
                  <span className="font-medium">{opportunity.views_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Applications</span>
                  <span className="font-medium">{opportunity.applications_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">
                    {new Date(opportunity.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span className="font-medium">
                    {new Date(opportunity.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
