export interface Confession {
  id: number;
  content: string;
  category_id?: number;
  category_name?: string;
  category_slug?: string;
  author_id?: number;
  author_username?: string;
  author_full_name?: string;
  is_anonymous: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  likes_count: number;
  comments_count: number;
  shares_count: number;
  is_hot: boolean;
  moderated_by?: number;
  moderated_by_username?: string;
  moderated_at?: string;
  moderation_reason?: string;
  ip_address?: string;
  user_agent?: string;
  abuse_score?: number;
  sentiment_score?: number;
  sentiment_label?: string;
  risk_level?: string;
  auto_flagged?: boolean;
  accountability_hash?: string;
  report_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateConfessionData {
  content: string;
  category_id?: number;
  is_anonymous?: boolean;
}

export interface UpdateConfessionData {
  status?: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderation_reason?: string;
  is_hot?: boolean;
}

export interface ConfessionFilters {
  page?: number;
  limit?: number;
  status?: string;
  category_id?: number;
  is_anonymous?: boolean;
  is_hot?: boolean;
  search?: string;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

export interface ConfessionStats {
  total_confessions: number;
  pending_approvals: number;
  approved_confessions: number;
  rejected_confessions: number;
  hot_confessions: number;
  flagged_confessions: number;
  auto_flagged_confessions: number;
  high_risk_confessions: number;
  total_reports: number;
  average_abuse_score: number;
  sentiment_distribution?: Array<{ label: string; count: number }>;
  risk_distribution?: Array<{ level: string; count: number }>;
}
