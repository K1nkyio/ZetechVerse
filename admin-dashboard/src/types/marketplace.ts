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

export interface ServiceDetails {
  pricing_model?: ServicePricingModel;
  service_area?: string;
  availability?: string;
}

export interface HostelDetails {
  room_type?: 'single' | 'shared' | 'studio' | 'bedsitter';
  beds_available?: number;
  gender_policy?: 'male' | 'female' | 'mixed';
  amenities?: string[];
}

export interface MarketplaceListing {
  id: number;
  title: string;
  description: string;
  price: number;
  category_id?: number;
  category_name?: string;
  category_slug?: string;
  listing_kind?: ListingKind;
  location?: string;
  condition?: 'new' | 'used' | 'refurbished' | null;
  status: 'active' | 'sold' | 'inactive';
  seller_id: number;
  seller_username: string;
  seller_full_name: string;
  phone?: string;
  image_urls: string[];
  tags: string[];
  contact_method: 'phone' | 'email' | 'in_app';
  is_negotiable: boolean;
  urgent: boolean;
  service_details?: ServiceDetails;
  hostel_details?: HostelDetails;
  views_count: number;
  created_at: string;
  updated_at: string;
  expires_at?: string;
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
  service_details?: ServiceDetails;
  hostel_details?: HostelDetails;
  phone?: string;
  image_urls?: string[];
  tags?: string[];
  contact_method?: 'phone' | 'email' | 'in_app';
  is_negotiable?: boolean;
  urgent?: boolean;
  status?: 'active' | 'sold' | 'inactive';
  expires_at?: string;
}

export interface MarketplaceFilters {
  page?: number;
  limit?: number;
  category_id?: number;
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

export interface MarketplaceStats {
  total_active: number;
  total_sold: number;
  total_views: number;
}
