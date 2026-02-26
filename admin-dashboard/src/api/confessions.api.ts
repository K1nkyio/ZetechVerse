import { apiClient, handleApiResponse, ApiResponse } from './base';
import type { Confession, CreateConfessionData, UpdateConfessionData, ConfessionFilters, ConfessionStats } from '../types/confession';

// API Functions
export const confessionsApi = {
  // Get all confessions with filtering and pagination
  async getConfessions(filters: ConfessionFilters = {}): Promise<{
    confessions: Confession[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await apiClient.get<Confession[]>('/confessions', filters);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'API request failed');
    }

    const confessions = Array.isArray(response.data.data) ? response.data.data : [];
    const pagination = response.data.pagination || { page: 1, limit: 10, total: confessions.length, pages: 1 };

    return {
      confessions,
      pagination
    };
  },

  // Get single confession by ID
  async getConfession(id: number): Promise<Confession> {
    const response = await apiClient.get<Confession>(`/confessions/${id}`);
    return handleApiResponse(response);
  },

  // Create new confession
  async createConfession(data: CreateConfessionData): Promise<Confession> {
    const response = await apiClient.post<Confession>('/confessions', data);
    return handleApiResponse(response);
  },

  // Update confession (admin moderation)
  async updateConfession(id: number, data: UpdateConfessionData): Promise<Confession> {
    const response = await apiClient.put<Confession>(`/confessions/${id}`, data);
    return handleApiResponse(response);
  },

  // Delete confession
  async deleteConfession(id: number): Promise<void> {
    const response = await apiClient.delete(`/confessions/${id}`);
    handleApiResponse(response);
  },

  // Approve confession
  async approveConfession(id: number): Promise<Confession> {
    const response = await apiClient.put<Confession>(`/confessions/${id}/approve`);
    return handleApiResponse(response);
  },

  // Reject confession
  async rejectConfession(id: number, reason?: string): Promise<Confession> {
    const response = await apiClient.put<Confession>(`/confessions/${id}/reject`, { reason });
    return handleApiResponse(response);
  },

  // Flag confession
  async flagConfession(id: number): Promise<Confession> {
    const response = await apiClient.put<Confession>(`/confessions/${id}/flag`);
    return handleApiResponse(response);
  },

  // Mark as hot
  async markAsHot(id: number, isHot: boolean = true): Promise<Confession> {
    const response = await apiClient.put<Confession>(`/confessions/${id}/hot`, { is_hot: isHot });
    return handleApiResponse(response);
  },

  // Get confession statistics
  async getConfessionStats(): Promise<ConfessionStats> {
    const response = await apiClient.get<ConfessionStats>('/confessions/admin/stats');
    return handleApiResponse(response);
  },

  // Get pending confessions (for moderation)
  async getPendingConfessions(filters: { page?: number; limit?: number } = {}): Promise<{
    confessions: Confession[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await apiClient.get<{
      confessions: Confession[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>('/confessions/admin/pending', filters);
    return handleApiResponse(response);
  },

  // Get all confession comments for moderation
  async getConfessionComments(filters: { page?: number; limit?: number; status?: string; confession_id?: number } = {}): Promise<{
    comments: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await apiClient.get<any>('/confessions/admin/comments', filters);

    if (!response.data.success) {
      throw new Error(response.data.message || 'API request failed');
    }

    const comments = Array.isArray(response.data.data) ? response.data.data : [];
    const pagination = response.data.pagination || { page: 1, limit: 10, total: comments.length, pages: 1 };

    return {
      comments,
      pagination,
    };
  },

  // Approve confession comment
  async approveConfessionComment(id: number): Promise<any> {
    const response = await apiClient.put<any>(`/confessions/admin/comments/${id}/approve`);
    return handleApiResponse(response);
  },

  // Reject confession comment
  async rejectConfessionComment(id: number): Promise<any> {
    const response = await apiClient.put<any>(`/confessions/admin/comments/${id}/reject`);
    return handleApiResponse(response);
  },

  // Delete confession comment
  async deleteConfessionComment(id: number): Promise<any> {
    const response = await apiClient.delete<any>(`/confessions/admin/comments/${id}`);
    return handleApiResponse(response);
  },

};