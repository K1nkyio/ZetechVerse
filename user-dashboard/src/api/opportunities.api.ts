import { apiClient } from './base';

// Types
export interface Opportunity {
  id: number;
  title: string;
  description: string;
  company: string;
  location?: string;
  type: 'internship' | 'attachment' | 'job' | 'scholarship' | 'volunteer';
  category_id?: number;
  category_name?: string;
  category_slug?: string;
  application_deadline?: string;
  start_date?: string;
  end_date?: string;
  salary_min?: number;
  salary_max?: number;
  currency: string;
  is_paid: boolean;
  is_remote: boolean;
  requirements: string[];
  benefits: string[];
  contact_email?: string;
  contact_phone?: string;
  application_url?: string;
  status: 'active' | 'expired' | 'filled';
  posted_by: number;
  posted_by_username: string;
  posted_by_full_name: string;
  views_count: number;
  applications_count: number;
  created_at: string;
  updated_at: string;
  days_until_deadline?: number;
  is_expired?: boolean;
}

interface OpportunitiesResponse {
  opportunities: Opportunity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const opportunitiesApi = {
  async getOpportunities(filters: any = {}): Promise<OpportunitiesResponse> {
    try {
      const response = await apiClient.get<Opportunity[]>('/opportunities', filters);

      if (!response.success || !response.data) {
        throw new Error(response.message || 'API request failed');
      }

      const opportunities = Array.isArray(response.data) ? response.data : [];
      const pagination = response.pagination || { page: 1, limit: 10, total: opportunities.length, pages: 1 };

      return {
        opportunities,
        pagination
      };
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      throw error;
    }
  },

  async getFeaturedOpportunities(limit: number = 6): Promise<OpportunitiesResponse> {
    try {
      const response = await apiClient.get<Opportunity[]>('/opportunities/featured', { limit });

      if (!response.success || !response.data) {
        throw new Error(response.message || 'API request failed');
      }

      const opportunities = Array.isArray(response.data) ? response.data : [];
      const pagination = response.pagination || { page: 1, limit, total: opportunities.length, pages: 1 };

      return {
        opportunities,
        pagination
      };
    } catch (error) {
      console.error('Error fetching featured opportunities:', error);
      throw error;
    }
  },

  async getOpportunityById(id: number): Promise<Opportunity> {
    try {
      const response = await apiClient.get<Opportunity>(`/opportunities/${id}`);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'API request failed');
      }
      return response.data;
    } catch (error) {
      console.error('Error fetching opportunity:', error);
      throw error;
    }
  },
};
