import { apiClient, handleApiResponse, ApiResponse } from './base';
import type { Event, CreateEventData, EventFilters, EventStats } from '../types/event';

// API Functions
export const eventsApi = {
  // Get all events with filtering and pagination
  async getEvents(filters: EventFilters = {}): Promise<{
    events: Event[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await apiClient.get<Event[]>('/events', filters);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'API request failed');
    }

    const events = Array.isArray(response.data.data) ? response.data.data : [];
    const pagination = response.data.pagination || { page: 1, limit: 10, total: events.length, pages: 1 };

    return {
      events,
      pagination
    };
  },

  // Get single event by ID
  async getEvent(id: number): Promise<Event> {
    const response = await apiClient.get<Event>(`/events/${id}`);
    return handleApiResponse(response);
  },

  // Create new event (requires authentication)
  async createEvent(data: CreateEventData): Promise<Event> {
    const response = await apiClient.post<Event>('/events', data);
    return handleApiResponse(response);
  },

  // Update event (requires authentication and ownership/admin)
  async updateEvent(id: number, data: Partial<CreateEventData>): Promise<Event> {
    const response = await apiClient.put<Event>(`/events/${id}`, data);
    return handleApiResponse(response);
  },

  // Delete event (requires authentication and ownership/admin)
  async deleteEvent(id: number): Promise<void> {
    const response = await apiClient.delete(`/events/${id}`);
    handleApiResponse(response);
  },

  // Get user's events (requires authentication)
  async getMyEvents(filters: { page?: number; limit?: number; status?: string } = {}): Promise<{
    events: Event[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await apiClient.get<{
      events: Event[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>('/events/user/my-events', filters);
    return handleApiResponse(response);
  },

  // Get event statistics (requires authentication)
  async getEventStats(): Promise<EventStats> {
    const response = await apiClient.get<EventStats>('/events/user/stats');
    return handleApiResponse(response);
  },

  // Get featured events
  async getFeaturedEvents(limit: number = 6): Promise<Event[]> {
    const response = await apiClient.get<Event[]>('/events/featured', { limit });
    return handleApiResponse(response);
  },

  // Get upcoming events
  async getUpcomingEvents(limit: number = 10): Promise<Event[]> {
    const response = await apiClient.get<Event[]>('/events/upcoming', { limit });
    return handleApiResponse(response);
  },
};
