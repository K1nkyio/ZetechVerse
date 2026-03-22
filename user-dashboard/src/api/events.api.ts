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
  agenda?: string[] | string;
  requirements?: string[] | string;
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
  attendee_preview?: Array<{
    user_id: number;
    group_name?: string | null;
    guest_count: number;
    status: string;
    reminder_opt_in: boolean;
    reminder_minutes: number;
    username?: string | null;
    full_name?: string | null;
    course?: string | null;
    year_of_study?: number | null;
    avatar_url?: string | null;
  }>;
  attendee_count?: number;
  my_rsvp?: {
    id: number;
    status: string;
    group_name?: string | null;
    guest_count: number;
    reminder_opt_in: boolean;
    reminder_minutes: number;
    networking_note?: string | null;
    checked_in?: boolean;
    attended_at?: string | null;
  } | null;
  photo_drops?: Array<{
    id: number;
    media_url: string;
    caption?: string | null;
    created_at: string;
    uploader_username?: string | null;
    uploader_full_name?: string | null;
  }>;
  suggested_connections?: Array<{
    id: number;
    username?: string | null;
    full_name?: string | null;
    course?: string | null;
    year_of_study?: number | null;
    avatar_url?: string | null;
    connection_reason: string;
  }>;
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

  async saveRsvp(
    id: string,
    data: {
      group_name?: string;
      guest_count?: number;
      reminder_opt_in?: boolean;
      reminder_minutes?: number;
      networking_note?: string;
    }
  ) {
    const response = await apiClient.post(`/events/${id}/rsvp`, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to save RSVP');
    }
    return response.data;
  }

  async checkIn(id: string): Promise<void> {
    const response = await apiClient.post(`/events/${id}/check-in`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to check in');
    }
  }

  async uploadPhoto(id: string, data: { media_url: string; caption?: string }): Promise<void> {
    const response = await apiClient.post(`/events/${id}/photos`, data);
    if (!response.success) {
      throw new Error(response.message || 'Failed to upload photo');
    }
  }

  async getEventSocial(id: string) {
    const response = await apiClient.get(`/events/${id}/social`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch event social data');
    }
    return response.data;
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
