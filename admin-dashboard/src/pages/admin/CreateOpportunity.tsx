import { AdminLayout } from "@/components/admin/AdminLayout";
import { OpportunityForm } from "@/components/admin/OpportunityForm";
import { useNavigate } from "react-router-dom";
import { opportunitiesApi, type CreateOpportunityData } from "@/api/opportunities.api";

export default function AdminCreateOpportunity() {
  const navigate = useNavigate();

  const handleSubmit = async (data: CreateOpportunityData) => {
    console.log('🔍 Creating opportunity with raw data:', data);
    console.log('📊 Data validation checks:');
    console.log('- Title length:', data.title?.length, 'min required: 5');
    console.log('- Description length:', data.description?.length, 'min required: 20');
    console.log('- Company length:', data.company?.length, 'min required: 2');
    console.log('- Type:', data.type, 'valid types:', ['internship', 'attachment', 'job', 'scholarship', 'volunteer']);
    console.log('- Dates:', { start: data.start_date, end: data.end_date, deadline: data.application_deadline });
    console.log('- Arrays:', { requirements: data.requirements, benefits: data.benefits });

    try {
      const result = await opportunitiesApi.createOpportunity(data);
      console.log('✅ Opportunity created successfully:', result);
      console.log('🧭 Navigating to /admin/opportunities');

      // Small delay to ensure API call completes and any state updates happen
      setTimeout(() => {
        navigate("/admin/opportunities", { replace: true });
      }, 100);
    } catch (error: any) {
      console.error('❌ Failed to create opportunity:', error);
      console.error('📋 Error details:', error.response?.data || error.message);
      console.error('🔍 Full error object:', error);
      throw error; // Re-throw so the form can handle it
    }
  };

  return (
    <AdminLayout variant="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Create New Opportunity</h1>
          <p className="text-muted-foreground">Add a new job opportunity, internship, or scholarship</p>
        </div>

        <OpportunityForm
          onSubmit={handleSubmit}
          onCancel={() => navigate("/admin/opportunities")}
        />
      </div>
    </AdminLayout>
  );
}

