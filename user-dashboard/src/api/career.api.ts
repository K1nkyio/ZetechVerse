import { apiClient, handleApiResponse } from './base';
import type { Opportunity } from './opportunities.api';

export interface CareerProfile {
  user_id: number;
  resume_url?: string | null;
  resume_filename?: string | null;
  skills: string[];
  interests: string[];
  linkedin_url?: string | null;
  portfolio_url?: string | null;
  mentor_open: boolean;
  mentor_bio?: string | null;
  mentorship_topics: string[];
}

export interface CareerRecommendation extends Opportunity {
  recommendation_score: number;
  recommendation_reasons: string[];
}

export interface ApplicationTrackerItem {
  id: number;
  opportunity_id: number;
  title: string;
  company: string;
  location?: string;
  type: string;
  application_deadline?: string;
  application_url?: string;
  opportunity_status: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  cover_letter?: string | null;
  resume_url?: string | null;
  additional_info?: string | null;
  applied_at: string;
}

export interface SavedOpportunity extends Opportunity {
  saved_at: string;
}

export interface MentorProfile {
  id: number;
  full_name?: string | null;
  username?: string | null;
  course?: string | null;
  year_of_study?: number | null;
  avatar_url?: string | null;
  mentor_bio?: string | null;
  mentorship_topics: string[];
  linkedin_url?: string | null;
  portfolio_url?: string | null;
}

export interface MentorConnection {
  id: number;
  mentor_id: number;
  mentee_id: number;
  mentor_full_name?: string | null;
  mentor_username?: string | null;
  mentee_full_name?: string | null;
  mentee_username?: string | null;
  message?: string | null;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  responded_at?: string | null;
}

class CareerApi {
  async getProfile(): Promise<CareerProfile> {
    const response = await apiClient.get<CareerProfile>('/career/profile');
    return handleApiResponse(response);
  }

  async updateProfile(data: Partial<CareerProfile>): Promise<CareerProfile> {
    const response = await apiClient.put<CareerProfile>('/career/profile', data);
    return handleApiResponse(response);
  }

  async getRecommendations(): Promise<CareerRecommendation[]> {
    const response = await apiClient.get<CareerRecommendation[]>('/career/recommendations');
    return handleApiResponse(response);
  }

  async getSavedOpportunities(): Promise<SavedOpportunity[]> {
    const response = await apiClient.get<SavedOpportunity[]>('/career/saved-opportunities');
    return handleApiResponse(response);
  }

  async toggleSavedOpportunity(opportunityId: number): Promise<{ saved: boolean }> {
    const response = await apiClient.post<{ saved: boolean }>(`/career/opportunities/${opportunityId}/save`);
    return handleApiResponse(response);
  }

  async submitApplication(
    opportunityId: number,
    data: {
      cover_letter?: string;
      resume_url?: string;
      additional_info?: string;
    }
  ): Promise<{ opportunity_id: number; resume_url?: string | null; external_application_url?: string | null }> {
    const response = await apiClient.post(`/career/opportunities/${opportunityId}/apply`, data);
    return handleApiResponse(response);
  }

  async getApplications(): Promise<ApplicationTrackerItem[]> {
    const response = await apiClient.get<ApplicationTrackerItem[]>('/career/applications');
    return handleApiResponse(response);
  }

  async getMentors(): Promise<MentorProfile[]> {
    const response = await apiClient.get<MentorProfile[]>('/career/mentors');
    return handleApiResponse(response);
  }

  async requestMentorConnection(mentorId: number, message?: string): Promise<void> {
    const response = await apiClient.post(`/career/mentors/${mentorId}/connect`, { message });
    handleApiResponse(response);
  }

  async getMentorConnections(): Promise<MentorConnection[]> {
    const response = await apiClient.get<MentorConnection[]>('/career/mentor-connections');
    return handleApiResponse(response);
  }
}

export const careerApi = new CareerApi();
