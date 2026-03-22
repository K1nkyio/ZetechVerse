import { apiClient } from './base';

export interface Confession {
  id: number;
  content: string;
  category_id?: number;
  category_name?: string;
  author_id?: number;
  author_username?: string;
  author_full_name?: string;
  is_anonymous: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  likes_count: number;
  likedByMe?: boolean;
  comments_count: number;
  shares_count: number;
  is_hot: boolean;
  moderated_by?: number;
  moderated_at?: string;
  moderation_reason?: string;
  ip_address?: string;
  user_agent?: string;
  abuse_score?: number;
  sentiment_score?: number;
  sentiment_label?: 'positive' | 'neutral' | 'negative' | string;
  risk_level?: 'low' | 'medium' | 'high' | string;
  auto_flagged?: boolean;
  accountability_hash?: string;
  report_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ConfessionComment {
  id: number | string;
  confession_id: number;
  content: string;
  is_anonymous: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'flagged' | string;
  created_at: string;
  updated_at?: string;
  author_username?: string;
  author_full_name?: string;
}

interface ConfessionsResponse {
  confessions: Confession[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const confessionsApi = {
  async getConfessions(
    filters: {
      page?: number;
      limit?: number;
      status?: 'pending' | 'approved' | 'rejected' | 'flagged';
      category_id?: number;
      sort_by?: string;
      sort_order?: 'ASC' | 'DESC';
    } = {}
  ): Promise<ConfessionsResponse> {
    try {
      const response = await apiClient.get<Confession[]>('/confessions', filters);

      if (!response.success || !response.data) {
        throw new Error(response.message || 'API request failed');
      }

      const confessions = Array.isArray(response.data) ? response.data : [];
      const pagination = response.pagination || { page: 1, limit: 10, total: confessions.length, pages: 1 };

      return {
        confessions,
        pagination
      };
    } catch (error) {
      console.error('Error fetching confessions:', error);
      throw error;
    }
  },

  async getConfessionById(id: number): Promise<Confession> {
    try {
      const response = await apiClient.get<Confession>(`/confessions/${id}`);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'API request failed');
      }
      return response.data;
    } catch (error) {
      console.error('Error fetching confession:', error);
      throw error;
    }
  },

  async createConfession(data: { content: string; is_anonymous?: boolean }): Promise<{ id: number }> {
    try {
      const response = await apiClient.post<{ id: number }>('/confessions', data);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to create confession');
      }
      return response.data;
    } catch (error) {
      console.error('Error creating confession:', error);
      throw error;
    }
  },

  async likeConfession(id: number): Promise<{ liked: boolean; message: string; likes_count?: number }> {
    try {
      const response = await apiClient.post(`/confessions/${id}/like`);
      if (!response.success) {
        throw new Error(response.message || 'Failed to like confession');
      }
      const payload: unknown = response.data ?? response;
      const parsedPayload =
        payload && typeof payload === 'object'
          ? (payload as { liked?: unknown; message?: unknown; likes_count?: unknown })
          : {};
      return {
        liked: typeof parsedPayload.liked === 'boolean' ? parsedPayload.liked : false,
        message:
          typeof parsedPayload.message === 'string'
            ? parsedPayload.message
            : response.message || 'Like status updated',
        likes_count: typeof parsedPayload.likes_count === 'number' ? parsedPayload.likes_count : 0
      };
    } catch (error) {
      console.error('Error liking confession:', error);
      throw error;
    }
  },

  async getConfessionComments(id: number, filters: { page?: number; limit?: number } = {}): Promise<{
    comments: ConfessionComment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const response = await apiClient.get<ConfessionComment[]>(`/confessions/${id}/comments`, filters);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to fetch comments');
      }
      return {
        comments: response.data || [],
        pagination: response.pagination || { page: 1, limit: 10, total: 0, pages: 0 }
      };
    } catch (error) {
      console.error('Error fetching confession comments:', error);
      throw error;
    }
  },

  async addConfessionComment(id: number, data: { content: string; parent_comment_id?: number; is_anonymous?: boolean }): Promise<{ id: number; message: string }> {
    try {
      const response = await apiClient.post(`/confessions/${id}/comments`, data);
      if (!response.success) {
        throw new Error(response.message || 'Failed to add comment');
      }
      return response.data;
    } catch (error) {
      console.error('Error adding confession comment:', error);
      throw error;
    }
  },

  async reportConfession(id: number, data: { reason: string; details?: string }): Promise<{ report_count: number }> {
    const response = await apiClient.post<{ report_count: number }>(`/confessions/${id}/report`, data);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to report confession');
    }
    return response.data;
  },
};
