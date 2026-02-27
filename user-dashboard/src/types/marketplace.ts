export interface MarketplaceListing {
  id: string;
  title: string;
  description?: string;
  price: number;
  location: string;
  image_urls?: string[];
  listing_kind?: 'product' | 'service' | 'hostel';
  condition: 'like-new' | 'excellent' | 'good' | 'fair' | 'poor';
  service_details?: {
    pricing_model?:
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
    service_area?: string;
    availability?: string;
  };
  hostel_details?: {
    room_type?: 'single' | 'shared' | 'studio' | 'bedsitter';
    beds_available?: number;
    gender_policy?: 'male' | 'female' | 'mixed';
    amenities?: string[];
  };
  urgent?: boolean;
  is_negotiable: boolean;
  seller_id?: string;
  seller_username?: string;
  seller_full_name?: string;
  seller_rating?: number;
  seller_reviews?: number;
  created_at?: string;
  updated_at?: string;
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
