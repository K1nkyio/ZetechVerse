import { apiClient } from './base';

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

export interface NotificationFilters {
  page?: number;
  limit?: number;
  is_read?: boolean | null; // null = all, true = read, false = unread
  type?: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UnreadCountResponse {
  unread_count: number;
}

class NotificationsApi {
  private isAuthError(error: any): boolean {
    const message = String(error?.message || '').toLowerCase();
    return (
      message.includes('access token is required') ||
      message.includes('invalid token') ||
      message.includes('token has expired') ||
      message.includes('authentication error')
    );
  }

  async getNotifications(filters: NotificationFilters = {}): Promise<NotificationResponse> {
    try {
      const response = await apiClient.get<Notification[]>('/notifications', filters);
      
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to fetch notifications');
      }
      
      return {
        notifications: response.data,
        pagination: response.pagination || { page: 1, limit: 20, total: 0, pages: 0 }
      };
    } catch (error) {
      if (this.isAuthError(error)) {
        return {
          notifications: [],
          pagination: { page: 1, limit: Number(filters.limit || 20), total: 0, pages: 0 }
        };
      }
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  async getUnreadCount(): Promise<UnreadCountResponse> {
    try {
      const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
      
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to fetch unread count');
      }
      
      return response.data;
    } catch (error) {
      if (this.isAuthError(error)) {
        return { unread_count: 0 };
      }
      console.error('Error fetching unread count:', error);
      throw error;
    }
  }

  async markAsRead(notificationId: number): Promise<void> {
    try {
      const response = await apiClient.put(`/notifications/${notificationId}/read`);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to mark notification as read');
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      const response = await apiClient.put('/notifications/mark-all-read');
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to mark all notifications as read');
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId: number): Promise<void> {
    try {
      const response = await apiClient.delete(`/notifications/${notificationId}`);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete notification');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }
}

export const notificationsApi = new NotificationsApi();
