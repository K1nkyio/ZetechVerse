import { apiClient } from './base';
import { authService } from '@/services/auth.service';
import { uploadsApi } from './uploads.api';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  role: string;
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
  student_id?: string;
  course?: string;
  year_of_study?: number;
  phone?: string;
}

class ProfileApi {
  async getProfile(): Promise<UserProfile> {
    try {
      const user = await authService.getProfile();
      return user as UserProfile;
    } catch (error) {
      const fallbackUser = authService.getCurrentUser();
      if (fallbackUser) {
        return fallbackUser as UserProfile;
      }
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<UserProfile> {
    return this.getProfile();
  }

  async getUserById(id: string): Promise<UserProfile> {
    try {
      const response = await apiClient.get<UserProfile>(`/users/${id}`);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.message || 'User not found');
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    try {
      // Use the auth service to update profile
      const user = await authService.updateProfile(data);
      return user as UserProfile;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  async uploadAvatar(file: File): Promise<{ avatar_url: string }> {
    try {
      const uploaded = await uploadsApi.uploadMedia(file);

      if (uploaded.media_type !== 'image') {
        throw new Error('Please upload an image file for your profile photo.');
      }

      return {
        avatar_url: uploaded.url
      };
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await authService.changePassword(currentPassword, newPassword);
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }
}

export const profileApi = new ProfileApi();
