import { apiClient } from './base';

export interface EventData {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location?: string;
  type: string;
  status: string;
  max_attendees?: number;
  current_attendees?: number;
  registration_deadline?: string;
  ticket_price?: number;
  is_paid?: boolean;
  registration_required?: boolean;
  image_url?: string;
  video_url?: string;
  image_urls?: string[];
  video_urls?: string[];
  media_urls?: string[];
  agenda?: string;
  requirements?: string;
  contact_email?: string;
  contact_phone?: string;
  website_url?: string;
  views_count?: number;
  likes_count?: number;
  likedByMe?: boolean;
  created_at: string;
  updated_at: string;
  organizer_name?: string;
  organizer_email?: string;
}

class EventsApi {
  async getUpcomingEvents(limit: number = 10): Promise<EventData[]> {
    try {
      const response = await apiClient.get<EventData[]>('/events/upcoming', { limit });
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
      throw error;
    }
  }

  async getEventById(id: string): Promise<EventData> {
    try {
      const response = await apiClient.get<EventData>(`/events/${id}`);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Event not found');
    } catch (error) {
      console.error('Error fetching event:', error);
      throw error;
    }
  }

  async toggleLike(id: string): Promise<{ liked: boolean; likes_count: number; message?: string }> {
    try {
      const response = await apiClient.post(`/events/${id}/like`);
      if (!response.success) {
        throw new Error(response.message || 'Failed to like event');
      }
      const payload: any = response.data ?? response;
      return {
        liked: typeof payload.liked === 'boolean' ? payload.liked : false,
        likes_count: typeof payload.likes_count === 'number' ? payload.likes_count : 0,
        message: payload.message || response.message
      };
    } catch (error) {
      console.error('Error liking event:', error);
      throw error;
    }
  }

  async getAllEvents(filters?: any): Promise<EventData[]> {
    try {
      const response = await apiClient.get<EventData[]>('/events', filters);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  }

  async createEvent(data: Partial<EventData>): Promise<EventData> {
    try {
      const response = await apiClient.post<EventData>('/events', data);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to create event');
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }
}

export const eventsApi = new EventsApi();
