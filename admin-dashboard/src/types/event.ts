export interface Event {
  id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location?: string;
  venue_details?: string;
  type: 'hackathon' | 'workshop' | 'competition' | 'social' | 'seminar' | 'cultural';
  category_id?: number;
  category_name?: string;
  category_slug?: string;
  organizer_id: number;
  organizer_username: string;
  organizer_full_name: string;
  max_attendees?: number;
  current_attendees: number;
  registration_deadline?: string;
  ticket_price: number;
  is_paid: boolean;
  registration_required: boolean;
  image_url?: string;
  video_url?: string;
  agenda: string[];
  requirements: string[];
  contact_email?: string;
  contact_phone?: string;
  website_url?: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  views_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateEventData {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location?: string;
  venue_details?: string;
  type: 'hackathon' | 'workshop' | 'competition' | 'social' | 'seminar' | 'cultural';
  category_id?: number;
  max_attendees?: number;
  registration_deadline?: string;
  ticket_price?: number;
  is_paid?: boolean;
  registration_required?: boolean;
  image_url?: string;
  video_url?: string;
  agenda?: string[];
  requirements?: string[];
  contact_email?: string;
  contact_phone?: string;
  website_url?: string;
  status?: 'draft' | 'published' | 'cancelled' | 'completed';
}

export interface EventFilters {
  page?: number;
  limit?: number;
  type?: string;
  category_id?: number;
  status?: string;
  search?: string;
  start_date_from?: string;
  start_date_to?: string;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

export interface EventStats {
  total_events: number;
  upcoming_events: number;
  total_attendees: number;
  published_events: number;
}
