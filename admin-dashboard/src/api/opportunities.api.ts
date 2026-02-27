import { apiClient, handleApiResponse, ApiResponse } from './base';

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
  responsibilities: string[];
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

export interface CreateOpportunityData {
  title: string;
  description: string;
  company: string;
  location?: string;
  type: 'internship' | 'attachment' | 'job' | 'scholarship' | 'volunteer';
  category_id?: number;
  application_deadline?: string;
  start_date?: string;
  end_date?: string;
  salary_min?: number;
  salary_max?: number;
  currency?: string;
  is_paid?: boolean;
  is_remote?: boolean;
  requirements?: string[];
  benefits?: string[];
  responsibilities?: string[];
  contact_email?: string;
  contact_phone?: string;
  application_url?: string;
}

export interface OpportunityFilters {
  page?: number;
  limit?: number;
  type?: string;
  category_id?: number;
  location?: string;
  is_remote?: boolean;
  is_paid?: boolean;
  search?: string;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
  status?: string;
}

export interface OpportunityStats {
  total_active: number;
  my_active: number;
  expiring_soon: number;
}

// API Functions
export const opportunitiesApi = {
  // Get all opportunities with filtering and pagination
  async getOpportunities(filters: OpportunityFilters = {}): Promise<{
    opportunities: Opportunity[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await apiClient.get<Opportunity[]>('/opportunities', filters);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'API request failed');
    }

    const opportunities = Array.isArray(response.data.data) ? response.data.data : [];
    const pagination = response.data.pagination || { page: 1, limit: 10, total: opportunities.length, pages: 1 };
    
    return {
      opportunities,
      pagination
    };
  },

  // Get single opportunity by ID
  async getOpportunity(id: number): Promise<Opportunity> {
    const response = await apiClient.get<Opportunity>(`/opportunities/${id}`);
    return handleApiResponse(response);
  },

  // Create new opportunity (requires authentication)
  async createOpportunity(data: CreateOpportunityData): Promise<Opportunity> {
    const response = await apiClient.post<Opportunity>('/opportunities', data);
    return handleApiResponse(response);
  },

  // Update opportunity (requires authentication and ownership/admin)
  async updateOpportunity(id: number, data: Partial<CreateOpportunityData>): Promise<Opportunity> {
    const response = await apiClient.put<Opportunity>(`/opportunities/${id}`, data);
    return handleApiResponse(response);
  },

  // Delete opportunity (requires authentication and ownership/admin)
  async deleteOpportunity(id: number): Promise<void> {
    const response = await apiClient.delete(`/opportunities/${id}`);
    handleApiResponse(response);
  },

  // Get user's opportunities (requires authentication)
  async getMyOpportunities(filters: { page?: number; limit?: number; status?: string } = {}): Promise<{
    opportunities: Opportunity[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await apiClient.get<{
      opportunities: Opportunity[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>('/opportunities/user/my-opportunities', filters);
    return handleApiResponse(response);
  },

  // Get opportunity statistics (requires authentication)
  async getOpportunityStats(): Promise<OpportunityStats> {
    const response = await apiClient.get<OpportunityStats>('/opportunities/user/stats');
    return handleApiResponse(response);
  },
};
