import { apiClient, handleApiResponse } from './base';

export type ListingKind = 'product' | 'service' | 'hostel';
export type ServicePricingModel =
  | 'per_hour'
  | 'per_task_assignment'
  | 'subscription_package'
  | 'pay_per_consultation_meeting'
  | 'freemium_addons'
  | 'tiered_pricing'
  | 'pay_what_you_want'
  | 'commission_performance_based'
  | 'group_bulk_rate'
  | 'one_time_flat_fee'
  | 'sliding_scale_income_based'
  | 'retainer_monthly_contract'
  | 'hybrid_hourly_task'
  | 'trial_paid_upgrade'
  | 'credit_token_system';

export interface MarketplaceListing {
  id: number;
  title: string;
  description?: string;
  price: number;
  category_id?: number;
  listing_kind?: ListingKind;
  location: string;
  condition?: string | null;
  status: string;
  seller_id: number;
  image_urls?: string[];
  tags?: string[];
  service_details?: {
    pricing_model?: ServicePricingModel;
    service_area?: string;
    availability?: string;
  };
  hostel_details?: {
    room_type?: 'single' | 'shared' | 'studio' | 'bedsitter';
    beds_available?: number;
    gender_policy?: 'male' | 'female' | 'mixed';
    amenities?: string[];
  };
  phone?: string;
  contact_method: string;
  is_negotiable: boolean;
  urgent?: boolean;
  views_count: number;
  likes_count?: number;
  likedByMe?: boolean;
  created_at?: string;
  updated_at?: string;
  expires_at?: string;
  // Additional fields from joins
  seller_username?: string;
  seller_full_name?: string;
  category_name?: string;
  category_slug?: string;
  reserved_by?: number | null;
  reserved_at?: string | null;
  reserved_until?: string | null;
  reservation_message?: string | null;
  seller_profile?: {
    id: number;
    full_name?: string | null;
    username?: string | null;
    verified_student: boolean;
    badge_label: string;
    average_rating: number;
    reviews_count: number;
    completed_transactions: number;
  };
  seller_reviews?: Array<{
    id: number;
    rating: number;
    review_text?: string | null;
    created_at: string;
    reviewer_username?: string | null;
    reviewer_full_name?: string | null;
  }>;
  safety_guidance?: string[];
  reservation?: {
    is_reserved: boolean;
    reserved_by?: number | null;
    reserved_at?: string | null;
    reserved_until?: string | null;
    reservation_message?: string | null;
  };
  report_summary?: {
    open_reports: number;
  };
  transaction_history?: Array<{
    id: number;
    amount: number;
    payment_status: string;
    meetup_status: string;
    note?: string | null;
    buyer_username?: string | null;
    buyer_full_name?: string | null;
    completed_at?: string | null;
    created_at: string;
  }>;
}

export interface MarketplaceCategory {
  id: number;
  name: string;
  slug: string;
}

export interface CreateMarketplaceListingData {
  title: string;
  description: string;
  price: number;
  category_id: number;
  listing_kind?: ListingKind;
  location?: string;
  condition?: 'new' | 'used' | 'refurbished';
  service_details?: MarketplaceListing['service_details'];
  hostel_details?: MarketplaceListing['hostel_details'];
  phone?: string;
  image_urls?: string[];
  tags?: string[];
  contact_method?: 'phone' | 'email' | 'in_app';
  is_negotiable?: boolean;
  urgent?: boolean;
  status?: 'active' | 'sold' | 'inactive';
  expires_at?: string;
}

export interface MarketplaceComment {
  id: string;
  listing_id: string;
  user_id: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  moderated_by?: string;
  moderated_at?: string;
  parent_comment_id?: string;
  likes_count: number;
  created_at: string;
  updated_at: string;
  // User information
  username?: string;
  full_name?: string;
  avatar_url?: string;
  // Parent comment info (for replies)
  parent_content?: string;
  parent_username?: string;
  parent_full_name?: string;
  // Reply count (for top-level comments)
  replies_count?: number;
  // Replies (for nested display)
  replies?: MarketplaceComment[];
}

export interface CommentResponse {
  comments: MarketplaceComment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface ListingsResponse {
  listings: MarketplaceListing[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface MarketplaceFilters {
  page?: number;
  limit?: number;
  category_id?: string;
  listing_kind?: ListingKind;
  location?: string;
  condition?: string;
  status?: string;
  search?: string;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
  price_min?: number;
  price_max?: number;
}

class MarketplaceApi {
  private async withRateLimitRetry<T>(fn: () => Promise<T>, maxRetries = 1): Promise<T> {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.status || err?.response?.status;
      const retryAfter = parseInt(err?.response?.headers?.['retry-after'] || '0', 10);
      if (status === 429 && maxRetries > 0) {
        const backoff = retryAfter > 0 ? retryAfter * 1000 : 800;
        await new Promise(res => setTimeout(res, backoff));
        return this.withRateLimitRetry(fn, maxRetries - 1);
      }
      throw err;
    }
  }
  async getListings(filters: MarketplaceFilters = {}): Promise<{
    listings: MarketplaceListing[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const response = await apiClient.get<MarketplaceListing[]>('/marketplace', filters);
      
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to fetch listings');
      }
      
      const listings = Array.isArray(response.data) ? response.data : [];
      const pagination = response.pagination || { page: 1, limit: 10, total: listings.length, pages: 1 };
      
      return {
        listings,
        pagination
      };
    } catch (error) {
      console.error('Error fetching marketplace listings:', error);
      throw error;
    }
  }

  async getCategories(): Promise<MarketplaceCategory[]> {
    const response = await apiClient.get<MarketplaceCategory[]>('/marketplace/categories');
    return handleApiResponse(response);
  }

  async getMyListings(filters: { page?: number; limit?: number; status?: string } = {}): Promise<{
    listings: MarketplaceListing[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const response = await apiClient.get<MarketplaceListing[]>('/marketplace/user/my-listings', filters);

    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch your listings');
    }

    const listings = Array.isArray(response.data) ? response.data : [];
    const pagination = response.pagination || { page: 1, limit: 10, total: listings.length, pages: 1 };

    return {
      listings,
      pagination,
    };
  }

  async getListingById(id: string): Promise<MarketplaceListing> {
    try {
      const response = await apiClient.get<MarketplaceListing>(`/marketplace/${id}`);
      return handleApiResponse(response);
    } catch (error) {
      console.error('Error fetching listing:', error);
      throw error;
    }
  }

  async toggleLike(id: string): Promise<{ liked: boolean; likes_count: number; message?: string }> {
    try {
      const response = await apiClient.post(`/marketplace/${id}/like`);
      if (!response.success) {
        throw new Error(response.message || 'Failed to like listing');
      }
      const payload: any = response.data ?? response;
      return {
        liked: typeof payload.liked === 'boolean' ? payload.liked : false,
        likes_count: typeof payload.likes_count === 'number' ? payload.likes_count : 0,
        message: payload.message || response.message
      };
    } catch (error) {
      console.error('Error liking listing:', error);
      throw error;
    }
  }

  async reserveListing(id: string, message?: string): Promise<{ reserved_by: number; reserved_at: string; reserved_until: string }> {
    const response = await apiClient.post(`/marketplace/${id}/reserve`, { message });
    return handleApiResponse(response);
  }

  async releaseReservation(id: string): Promise<void> {
    const response = await apiClient.delete(`/marketplace/${id}/reserve`);
    handleApiResponse(response);
  }

  async submitSellerReview(id: string, data: { rating: number; review_text?: string }): Promise<MarketplaceListing['seller_profile']> {
    const response = await apiClient.post(`/marketplace/${id}/reviews`, data);
    return handleApiResponse(response);
  }

  async reportListing(id: string, data: { reason: string; details?: string; risk_level?: 'low' | 'medium' | 'high' }): Promise<void> {
    const response = await apiClient.post(`/marketplace/${id}/report`, data);
    handleApiResponse(response);
  }

  async recordTransaction(
    id: string,
    data: {
      amount?: number;
      payment_status?: 'pending' | 'paid' | 'refunded';
      meetup_status?: 'planned' | 'completed' | 'cancelled';
      note?: string;
      buyer_id?: number;
      mark_sold?: boolean;
    }
  ): Promise<void> {
    const response = await apiClient.post(`/marketplace/${id}/transactions`, data);
    handleApiResponse(response);
  }

  async getUserTransactions(): Promise<MarketplaceListing['transaction_history']> {
    const response = await apiClient.get('/marketplace/user/transactions');
    return handleApiResponse(response);
  }

  async createListing(data: CreateMarketplaceListingData): Promise<{ id: number }> {
    try {
      const response = await apiClient.post<{ id: number }>('/marketplace', data);
      return handleApiResponse(response);
    } catch (error) {
      console.error('Error creating listing:', error);
      throw error;
    }
  }

  async updateListing(id: string | number, data: Partial<CreateMarketplaceListingData>): Promise<void> {
    try {
      const response = await apiClient.put<void>(`/marketplace/${id}`, data);
      handleApiResponse(response);
    } catch (error) {
      console.error('Error updating listing:', error);
      throw error;
    }
  }

  async deleteListing(id: string | number): Promise<void> {
    try {
      const response = await apiClient.delete(`/marketplace/${id}`);
      handleApiResponse(response);
    } catch (error) {
      console.error('Error deleting listing:', error);
      throw error;
    }
  }

  // Comment-related methods
  async getComments(listingId: string, options?: {
    page?: number;
    limit?: number;
    status?: 'pending' | 'approved' | 'rejected';
    sort_by?: string;
    sort_order?: 'ASC' | 'DESC';
  }): Promise<CommentResponse> {
    try {
      const response = await apiClient.get<MarketplaceComment[]>(
        `/marketplace-comments/listings/${listingId}/comments`,
        options
      );

      if (response.success && response.data) {
        return {
          comments: Array.isArray(response.data) ? response.data : [],
          pagination: response.pagination || { page: 1, limit: 10, total: 0, pages: 0 }
        };
      }

      return { comments: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } };
    } catch (error) {
      console.error('Error fetching marketplace comments:', error);
      throw error;
    }
  }

  async getTopLevelComments(listingId: string, options?: {
    page?: number;
    limit?: number;
    status?: 'pending' | 'approved' | 'rejected';
    sort_by?: string;
    sort_order?: 'ASC' | 'DESC';
  }): Promise<CommentResponse> {
    try {
      const response = await this.withRateLimitRetry(() =>
        apiClient.get<MarketplaceComment[]>(
          `/marketplace-comments/listings/${listingId}/comments/top-level`,
          options
        )
      );

      if (response.success && response.data) {
        return {
          comments: Array.isArray(response.data) ? response.data : [],
          pagination: response.pagination || { page: 1, limit: 10, total: 0, pages: 0 }
        };
      }

      return { comments: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } };
    } catch (error) {
      console.error('Error fetching top-level marketplace comments:', error);
      throw error;
    }
  }

  async getCommentReplies(commentId: string, options?: {
    page?: number;
    limit?: number;
    status?: 'pending' | 'approved' | 'rejected';
    sort_by?: string;
    sort_order?: 'ASC' | 'DESC';
  }): Promise<CommentResponse> {
    try {
      const response = await this.withRateLimitRetry(() =>
        apiClient.get<MarketplaceComment[]>(
          `/marketplace-comments/comments/${commentId}/replies`,
          options
        )
      );

      if (response.success && response.data) {
        return {
          comments: Array.isArray(response.data) ? response.data : [],
          pagination: response.pagination || { page: 1, limit: 10, total: 0, pages: 0 }
        };
      }

      return { comments: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } };
    } catch (error) {
      console.error('Error fetching comment replies:', error);
      throw error;
    }
  }

  async createComment(listingId: string, data: {
    content: string;
    parent_comment_id?: string;
  }): Promise<MarketplaceComment> {
    try {
      const response = await apiClient.post<MarketplaceComment>(
        `/marketplace-comments/listings/${listingId}/comments`,
        data
      );

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to create comment');
    } catch (error) {
      console.error('Error creating marketplace comment:', error);
      throw error;
    }
  }

  async updateComment(commentId: string, data: { content: string }): Promise<MarketplaceComment> {
    try {
      const response = await apiClient.put<MarketplaceComment>(
        `/marketplace-comments/comments/${commentId}`,
        data
      );

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to update comment');
    } catch (error) {
      console.error('Error updating marketplace comment:', error);
      throw error;
    }
  }

  async deleteComment(commentId: string): Promise<void> {
    try {
      await apiClient.delete(`/marketplace-comments/comments/${commentId}`);
    } catch (error) {
      console.error('Error deleting marketplace comment:', error);
      throw error;
    }
  }

  async likeComment(commentId: string): Promise<void> {
    try {
      await this.withRateLimitRetry(() => apiClient.post(`/marketplace-comments/comments/${commentId}/like`));
    } catch (error) {
      console.error('Error liking marketplace comment:', error);
      throw error;
    }
  }

  async unlikeComment(commentId: string): Promise<void> {
    try {
      await apiClient.delete(`/marketplace-comments/comments/${commentId}/like`);
    } catch (error) {
      console.error('Error unliking marketplace comment:', error);
      throw error;
    }
  }
}

export const marketplaceApi = new MarketplaceApi();
