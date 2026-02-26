import { apiClient, handleApiResponse, ApiResponse } from './base';

// Types
export interface Notification {
  id: number;
  user_id: number;
  type:
    | 'system'
    | 'personal'
    | 'reminder'
    | 'alert'
    | 'maintenance'
    | 'update'
    | 'announcement'
    | 'marketplace'
    | 'opportunities'
    | 'events'
    | 'confessions'
    | 'posts'
    | 'confession_like'
    | 'confession_comment'
    | 'event_reminder'
    | 'application_update'
    | 'listing_sold'
    | 'blog_comment';
  title: string;
  message: string;
  related_id?: number;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface CreateSystemNotificationData {
  type: 'system' | 'maintenance' | 'update' | 'announcement';
  title: string;
  message: string;
  related_id?: number;
}

export interface CreateUserNotificationData {
  user_id: number;
  type: 'personal' | 'system' | 'reminder' | 'alert';
  title: string;
  message: string;
  related_id?: number;
}

export interface NotificationFilters {
  page?: number;
  limit?: number;
  is_read?: boolean | null; // null = all, true = read, false = unread
  type?: string;
}

// API Functions
export const notificationsApi = {
  // Get notifications for current user
  async getNotifications(filters: NotificationFilters = {}): Promise<{
    notifications: Notification[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await apiClient.get<Notification[]>('/notifications', filters);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'API request failed');
    }

    const notifications = Array.isArray(response.data.data) ? response.data.data : [];
    const pagination = response.data.pagination || { page: 1, limit: 20, total: notifications.length, pages: 1 };

    return {
      notifications,
      pagination
    };
  },

  // Get unread notification count
  async getUnreadCount(): Promise<{ unread_count: number }> {
    const response = await apiClient.get<{ unread_count: number }>('/notifications/unread-count');
    return handleApiResponse(response);
  },

  // Mark notification as read
  async markAsRead(id: number): Promise<void> {
    const response = await apiClient.put(`/notifications/${id}/read`);
    handleApiResponse(response);
  },

  // Mark all notifications as read
  async markAllAsRead(): Promise<void> {
    const response = await apiClient.put('/notifications/mark-all-read');
    handleApiResponse(response);
  },

  // Delete notification
  async deleteNotification(id: number): Promise<void> {
    const response = await apiClient.delete(`/notifications/${id}`);
    handleApiResponse(response);
  },

  // Create system notification (admin/super admin only)
  async createSystemNotification(data: CreateSystemNotificationData): Promise<{
    notification_ids: number[];
    count: number;
  }> {
    const response = await apiClient.post<{
      notification_ids: number[];
      count: number;
    }>('/notifications/system', data);
    return handleApiResponse(response);
  },

  // Create user notification (admin/super admin only)
  async createUserNotification(data: CreateUserNotificationData): Promise<{
    notification_id: number;
  }> {
    const response = await apiClient.post<{
      notification_id: number;
    }>('/notifications/user', data);
    return handleApiResponse(response);
  },
};
