import { apiClient, handleApiResponse } from './base';

// Types
export interface UserProfile {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  role: 'user' | 'admin' | 'super_admin' | 'anonymous';
  student_id?: string;
  course?: string;
  year_of_study?: number;
  phone?: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface UpdateProfileData {
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  phone?: string;
  course?: string;
  year_of_study?: number;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
}

// API Functions
export const profileApi = {
  // Get current user profile
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get<UserProfile>('/auth/profile');
    return handleApiResponse(response);
  },

  // Update user profile
  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    const response = await apiClient.put<UserProfile>('/auth/profile', data);
    return handleApiResponse(response);
  },

  // Change password
  async changePassword(data: ChangePasswordData): Promise<{ message: string }> {
    const response = await apiClient.put<{ message: string }>('/auth/change-password', data);
    return handleApiResponse(response);
  },
};