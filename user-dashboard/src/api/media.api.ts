import { apiClient } from './base';

export interface MediaItem {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
  thumbnail_url?: string;
  alt_text?: string;
  caption?: string;
  description?: string;
  folder_id?: string;
  user_id: string;
  uploaded_at: string;
  updated_at: string;
}

export interface MediaFolder {
  id: string;
  name: string;
  parent_id?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface UploadResponse {
  id: string;
  filename: string;
  url: string;
  thumbnail_url?: string;
  size: number;
  mime_type: string;
}

export interface MediaLibraryResponse {
  items: MediaItem[];
  folders: MediaFolder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class MediaApi {
  async uploadFile(file: File, folderId?: string, altText?: string): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (folderId) {
        formData.append('folder_id', folderId);
      }
      
      if (altText) {
        formData.append('alt_text', altText);
      }

      // For file uploads, we need to use the raw fetch API or a different approach
      // This is a simplified version - in reality, file uploads may need special handling
      const response = await apiClient.post<UploadResponse>('/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to upload file');
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  async getMediaLibrary(folderId?: string, options?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: 'image' | 'video' | 'document' | 'all';
    sort_by?: string;
    sort_order?: 'ASC' | 'DESC';
  }): Promise<MediaLibraryResponse> {
    try {
      const params: any = {
        ...options
      };

      if (folderId) {
        params.folder_id = folderId;
      }

      const response = await apiClient.get<{
        success: boolean;
        data: {
          items: MediaItem[];
          folders: MediaFolder[];
        };
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      }>('/media/library', params);

      if (response.success && response.data) {
        return {
          items: Array.isArray(response.data.items) ? response.data.items : [],
          folders: Array.isArray(response.data.folders) ? response.data.folders : [],
          pagination: response.pagination || { page: 1, limit: 10, total: 0, pages: 0 }
        };
      }

      return {
        items: [],
        folders: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 }
      };
    } catch (error) {
      console.error('Error fetching media library:', error);
      throw error;
    }
  }

  async getMediaItem(id: string): Promise<MediaItem> {
    try {
      const response = await apiClient.get<MediaItem>(`/media/${id}`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Media item not found');
    } catch (error) {
      console.error('Error fetching media item:', error);
      throw error;
    }
  }

  async updateMediaItem(id: string, data: Partial<MediaItem>): Promise<MediaItem> {
    try {
      const response = await apiClient.put<MediaItem>(`/media/${id}`, data);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to update media item');
    } catch (error) {
      console.error('Error updating media item:', error);
      throw error;
    }
  }

  async deleteMediaItem(id: string): Promise<void> {
    try {
      const response = await apiClient.delete<{ success: boolean; message: string }>(`/media/${id}`);

      if (!response.success) {
        throw new Error(response.message || 'Failed to delete media item');
      }
    } catch (error) {
      console.error('Error deleting media item:', error);
      throw error;
    }
  }

  async createFolder(name: string, parentId?: string): Promise<MediaFolder> {
    try {
      const response = await apiClient.post<MediaFolder>('/media/folders', {
        name,
        parent_id: parentId
      });

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to create folder');
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  async getFolders(parentId?: string): Promise<MediaFolder[]> {
    try {
      const params: any = {};
      if (parentId) {
        params.parent_id = parentId;
      }

      const response = await apiClient.get<MediaFolder[]>('/media/folders', params);

      if (response.success && response.data) {
        return Array.isArray(response.data) ? response.data : [];
      }

      return [];
    } catch (error) {
      console.error('Error fetching folders:', error);
      return [];
    }
  }

  async deleteFolder(id: string): Promise<void> {
    try {
      const response = await apiClient.delete<{ success: boolean; message: string }>(`/media/folders/${id}`);

      if (!response.success) {
        throw new Error(response.message || 'Failed to delete folder');
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  }

  async searchMedia(query: string, options?: {
    type?: 'image' | 'video' | 'document' | 'all';
    limit?: number;
  }): Promise<MediaItem[]> {
    try {
      const response = await apiClient.get<MediaItem[]>('/media/search', {
        q: query,
        ...options
      });

      if (response.success && response.data) {
        return Array.isArray(response.data) ? response.data : [];
      }

      return [];
    } catch (error) {
      console.error('Error searching media:', error);
      return [];
    }
  }
}

export const mediaApi = new MediaApi();