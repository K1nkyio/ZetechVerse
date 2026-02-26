import { AdminLayout } from "@/components/admin/AdminLayout";
import { EventForm } from "@/components/admin/EventForm";
import { useNavigate } from "react-router-dom";
import { eventsApi, type CreateEventData } from "@/api/events.api";

export default function AdminCreateEvent() {
  const navigate = useNavigate();

  const handleSubmit = async (data: CreateEventData) => {
    console.log('🔍 Creating event with raw data:', data);
    console.log('📊 Data validation checks:');
    console.log('- Title length:', data.title?.length, 'min required: 5');
    console.log('- Description length:', data.description?.length, 'min required: 20');
    console.log('- Type:', data.type, 'valid types:', ['hackathon', 'workshop', 'competition', 'social', 'seminar', 'cultural']);
    console.log('- Dates:', { start: data.start_date, end: data.end_date, registration_deadline: data.registration_deadline });
    console.log('- Required fields:', { title: !!data.title, description: !!data.description, start_date: !!data.start_date, end_date: !!data.end_date });

    try {
      const result = await eventsApi.createEvent(data);
      console.log('✅ Event created successfully:', result);
      console.log('🧭 Navigating to /admin/events');

      setTimeout(() => {
        navigate("/admin/events", { replace: true });
      }, 100);
    } catch (error: any) {
      console.error('❌ Failed to create event:', error);
      console.error('📋 Error details:', error.message);
      console.error('🔍 Full error object:', error);
      
      // Extract validation errors from response
      if (error.errors && Array.isArray(error.errors)) {
        console.error('📝 Validation errors:');
        error.errors.forEach((err: any) => {
          const field = err.field || err.param || 'unknown';
          const message = err.message || err.msg || 'Validation failed';
          console.error(`  - ${field}: ${message}`);
        });
      } else if (error.message) {
        console.error('Error message:', error.message);
      }
      
      throw error;
    }
  };

  return (
    <AdminLayout variant="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Create New Event</h1>
          <p className="text-muted-foreground">Organize a new university event</p>
        </div>

        <EventForm
          onSubmit={handleSubmit}
          onCancel={() => navigate("/admin/events")}
        />
      </div>
    </AdminLayout>
  );
}

