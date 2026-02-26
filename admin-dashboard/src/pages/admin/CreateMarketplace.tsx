import { AdminLayout } from "@/components/admin/AdminLayout";
import { MarketplaceForm } from "@/components/admin/MarketplaceForm";
import { useNavigate } from "react-router-dom";
import { marketplaceApi, type CreateMarketplaceListingData } from "@/api/marketplace.api";

export default function AdminCreateMarketplace() {
  const navigate = useNavigate();

  const handleSubmit = async (data: CreateMarketplaceListingData) => {
    console.log('🔍 Creating marketplace listing with raw data:', data);
    console.log('📊 Data validation checks:');
    console.log('- Title length:', data.title?.length, 'min required: 5');
    console.log('- Description length:', data.description?.length, 'min required: 10');
    console.log('- Price:', data.price, 'must be > 0');
    console.log('- Required fields:', { title: !!data.title, description: !!data.description, price: !!data.price });

    try {
      const result = await marketplaceApi.createListing(data);
      console.log('✅ Marketplace listing created successfully:', result);
      console.log('🧭 Navigating to /admin/marketplace');

      setTimeout(() => {
        navigate("/admin/marketplace", { replace: true });
      }, 100);
    } catch (error: any) {
      console.error('❌ Failed to create marketplace listing:', error);
      console.error('📋 Error details:', error.response?.data || error.message);
      console.error('🔍 Full error object:', error);
      throw error;
    }
  };

  return (
    <AdminLayout variant="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Create New Marketplace Listing</h1>
          <p className="text-muted-foreground">Add a new item to the marketplace</p>
        </div>

        <MarketplaceForm
          onSubmit={handleSubmit}
          onCancel={() => navigate("/admin/marketplace")}
        />
      </div>
    </AdminLayout>
  );
}

