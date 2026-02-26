export interface MarketplaceListing {
  id: number;
  title: string;
  description: string;
  price: number;
  category_id?: number;
  category_name?: string;
  category_slug?: string;
  location?: string;
  condition: 'new' | 'used' | 'refurbished';
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
  location?: string;
  condition?: 'new' | 'used' | 'refurbished';
  phone?: string;
  image_urls?: string[];
  tags?: string[];
  contact_method?: 'phone' | 'email' | 'in_app';
  is_negotiable?: boolean;
  urgent?: boolean;
  expires_at?: string;
}

export interface MarketplaceFilters {
  page?: number;
  limit?: number;
  category_id?: number;
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
