import { apiClient } from './base';
import type { Message, SendMessageData, ConversationMessage } from '@/types/message';

class MessagesApi {
  async sendMessage(data: SendMessageData): Promise<Message> {
    try {
      const response = await apiClient.post<Message>('/messages', data);
      return response.data!;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async getConversation(userId: number, listingId?: number): Promise<Message[]> {
    try {
      const url = listingId ? `/messages/conversation/${userId}/${listingId}` : `/messages/conversation/${userId}`;
      const response = await apiClient.get<Message[]>(url);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching conversation:', error);
      throw error;
    }
  }

  async getInbox(page: number = 1, limit: number = 20, unreadOnly: boolean = false): Promise<{
    messages: ConversationMessage[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const response = await apiClient.get<any>('/messages/inbox', {
        page,
        limit,
        unreadOnly
      });
      return {
        messages: response.data || [],
        pagination: response.pagination || { page, limit, total: 0, pages: 0 }
      };
    } catch (error) {
      console.error('Error fetching inbox:', error);
      throw error;
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      const response = await apiClient.get<{ unread_count: number }>('/messages/unread-count');
      return response.data?.unread_count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }
  }

  async markAsRead(messageId: number): Promise<void> {
    try {
      await apiClient.put(`/messages/${messageId}/read`, {});
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }

  async deleteMessage(messageId: number): Promise<void> {
    try {
      await apiClient.delete(`/messages/${messageId}`);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }
}

export const messagesApi = new MessagesApi();
