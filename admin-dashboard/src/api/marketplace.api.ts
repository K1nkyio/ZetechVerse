import { apiClient, handleApiResponse, ApiResponse } from './base';
import type {
  MarketplaceListing,
  CreateMarketplaceListingData,
  MarketplaceFilters,
  MarketplaceStats,
  MarketplaceCategory
} from '../types/marketplace';

// API Functions
export const marketplaceApi = {
  // Get marketplace categories
  async getCategories(): Promise<MarketplaceCategory[]> {
    const response = await apiClient.get<MarketplaceCategory[]>('/marketplace/categories');
    return handleApiResponse(response);
  },

  // Get all marketplace listings with filtering and pagination
  async getListings(filters: MarketplaceFilters = {}): Promise<{
    listings: MarketplaceListing[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await apiClient.get<MarketplaceListing[]>('/marketplace', filters);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'API request failed');
    }

    const listings = Array.isArray(response.data.data) ? response.data.data : [];
    const pagination = response.data.pagination || { page: 1, limit: 10, total: listings.length, pages: 1 };

    return {
      listings,
      pagination
    };
  },

  // Get single marketplace listing by ID
  async getListing(id: number): Promise<MarketplaceListing> {
    const response = await apiClient.get<MarketplaceListing>(`/marketplace/${id}`);
    return handleApiResponse(response);
  },

  // Create new marketplace listing (requires authentication)
  async createListing(data: CreateMarketplaceListingData): Promise<MarketplaceListing> {
    const response = await apiClient.post<MarketplaceListing>('/marketplace', data);
    return handleApiResponse(response);
  },

  // Update marketplace listing (requires authentication and ownership/admin)
  async updateListing(id: number, data: Partial<CreateMarketplaceListingData>): Promise<MarketplaceListing> {
    const response = await apiClient.put<MarketplaceListing>(`/marketplace/${id}`, data);
    return handleApiResponse(response);
  },

  // Delete marketplace listing (requires authentication and ownership/admin)
  async deleteListing(id: number): Promise<void> {
    const response = await apiClient.delete(`/marketplace/${id}`);
    handleApiResponse(response);
  },

  // Get user's marketplace listings (requires authentication)
  async getMyListings(filters: { page?: number; limit?: number; status?: string } = {}): Promise<{
    listings: MarketplaceListing[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await apiClient.get<{
      listings: MarketplaceListing[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>('/marketplace/user/my-listings', filters);
    return handleApiResponse(response);
  },

  // Get marketplace statistics (requires authentication)
  async getMarketplaceStats(): Promise<MarketplaceStats> {
    const response = await apiClient.get<MarketplaceStats>('/marketplace/user/stats');
    return handleApiResponse(response);
  },
};
