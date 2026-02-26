import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { OpportunityForm } from "@/components/admin/OpportunityForm";
import { opportunitiesApi, type Opportunity, type CreateOpportunityData } from "@/api/opportunities.api";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminEditOpportunity() {
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

  const handleSubmit = async (data: CreateOpportunityData) => {
    if (!id) return;
    await opportunitiesApi.updateOpportunity(parseInt(id), data);
    navigate("/admin/opportunities");
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
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Edit Opportunity</h1>
          <p className="text-muted-foreground">Update opportunity details</p>
        </div>

        <OpportunityForm
          initialData={opportunity}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/admin/opportunities")}
          isEditing={true}
        />
      </div>
    </AdminLayout>
  );
}

