import { apiClient } from './base';

export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  category_id?: number;
  category_name?: string;
  tags: string[];
  image_url?: string;
  video_url?: string;
  image_urls?: string[];
  video_urls?: string[];
  media_urls?: string[];
  status: 'draft' | 'pending' | 'published' | 'rejected';
  author_id: number;
  author_username?: string;
  author_name?: string;
  author_avatar?: string;
  views_count: number;
  likes_count: number;
  likedByMe?: boolean;
  comments_count: number;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PostResponse {
  posts: Post[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CreatePostData {
  title: string;
  content: string;
  excerpt?: string;
  category?: string;
  tags?: string[];
  featured_image?: string;
  video_url?: string;
  status?: 'draft' | 'pending';
}

class PostsApi {
  async getPosts(options?: {
    page?: number;
    limit?: number;
    status?: 'draft' | 'pending' | 'published' | 'rejected' | 'all';
    category?: string;
    search?: string;
    sort_by?: string;
    sort_order?: 'ASC' | 'DESC';
  }): Promise<PostResponse> {
    try {
      // Ensure status defaults to 'published' for user dashboard
      const params = {
        ...options,
        status: options?.status || 'published'
      };
      
      console.log('[PostsAPI] Calling getPosts with params:', params);
      
      const response = await apiClient.get<{
        success: boolean;
        data: Post[];
        pagination: PostResponse['pagination'];
      }>('/posts', params);

      console.log('[PostsAPI] Raw API response:', response);
      console.log('[PostsAPI] response.success:', response.success);
      console.log('[PostsAPI] response.data:', response.data);

      if (response.success && response.data) {
        const posts = Array.isArray(response.data) ? response.data : [];
        console.log('[PostsAPI] Extracted posts array:', posts);
        
        return {
          posts: posts,
          pagination: response.pagination || { page: 1, limit: 10, total: 0, pages: 0 }
        };
      }

      console.warn('[PostsAPI] Response not successful or no data');
      return { posts: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } };
    } catch (error) {
      console.error('[PostsAPI] Error fetching posts:', error);
      throw error;
    }
  }

  async getPostById(id: string): Promise<Post> {
    try {
      const response = await apiClient.get<Post>(`/posts/${id}`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Post not found');
    } catch (error) {
      console.error('Error fetching post:', error);
      throw error;
    }
  }

  async toggleLike(id: string): Promise<{ liked: boolean; likes_count: number; message?: string }> {
    try {
      const response = await apiClient.post(`/posts/${id}/like`);
      if (!response.success) {
        throw new Error(response.message || 'Failed to like post');
      }
      const payload: any = response.data ?? response;
      return {
        liked: typeof payload.liked === 'boolean' ? payload.liked : false,
        likes_count: typeof payload.likes_count === 'number' ? payload.likes_count : 0,
        message: payload.message || response.message
      };
    } catch (error) {
      console.error('Error liking post:', error);
      throw error;
    }
  }

  async getFeaturedPosts(limit: number = 6): Promise<Post[]> {
    try {
      const response = await apiClient.get<{ 
        success: boolean; 
        data: Post[]; 
      }>(`/posts/featured?limit=${limit}`);

      if (response.success && response.data) {
        return Array.isArray(response.data) ? response.data : [];
      }

      return [];
    } catch (error) {
      console.error('Error fetching featured posts:', error);
      return [];
    }
  }

  async createPost(data: CreatePostData): Promise<Post> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        data: Post;
      }>('/posts', data);

      if (response.data?.success && response.data.data) {
        return response.data.data;
      }

      throw new Error(response.data?.message || 'Failed to create post');
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  async updatePost(id: string, data: Partial<CreatePostData>): Promise<Post> {
    try {
      const response = await apiClient.put<Post>(`/posts/${id}`, data);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to update post');
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  }

  async deletePost(id: string): Promise<void> {
    try {
      const response = await apiClient.delete<{ success: boolean; message: string }>(`/posts/${id}`);

      if (!response.success) {
        throw new Error(response.message || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }

  async getMyPosts(options?: {
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: 'ASC' | 'DESC';
  }): Promise<PostResponse> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: Post[];
        pagination: PostResponse['pagination'];
      }>('/posts/user/my-posts', options);

      if (response.data?.success) {
        return {
          posts: response.data.data || [],
          pagination: response.data.pagination || { page: 1, limit: 10, total: 0, pages: 0 }
        };
      }

      return { posts: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } };
    } catch (error) {
      console.error('Error fetching my posts:', error);
      throw error;
    }
  }

  async publishPost(id: string): Promise<Post> {
    try {
      const response = await apiClient.put<Post>(`/posts/${id}/publish`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to publish post');
    } catch (error) {
      console.error('Error publishing post:', error);
      throw error;
    }
  }

  async unpublishPost(id: string): Promise<Post> {
    try {
      const response = await apiClient.put<Post>(`/posts/${id}/unpublish`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to unpublish post');
    } catch (error) {
      console.error('Error unpublishing post:', error);
      throw error;
    }
  }

  async schedulePost(id: string, scheduledAt: string): Promise<Post> {
    try {
      const response = await apiClient.put<Post>(`/posts/${id}/schedule`, { scheduled_at: scheduledAt });

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to schedule post');
    } catch (error) {
      console.error('Error scheduling post:', error);
      throw error;
    }
  }

  async getPostVersions(id: string): Promise<Post[]> {
    try {
      const response = await apiClient.get<Post[]>(`/posts/${id}/versions`);

      if (response.success && response.data) {
        return Array.isArray(response.data) ? response.data : [];
      }

      return [];
    } catch (error) {
      console.error('Error fetching post versions:', error);
      return [];
    }
  }

  async revertToVersion(postId: string, versionId: string): Promise<Post> {
    try {
      const response = await apiClient.post<Post>(`/posts/${postId}/revert`, { version_id: versionId });

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to revert to version');
    } catch (error) {
      console.error('Error reverting to version:', error);
      throw error;
    }
  }

  async getCategories(): Promise<Array<{ category: string; count: number; slug: string }>> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: Array<{ category: string; count: number; slug: string }>;  
      }>('/posts/categories');

      if (response.success && response.data) {
        return Array.isArray(response.data) ? response.data : [];
      }

      return [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  async getTags(): Promise<Array<{ tag: string; count: number; slug: string }>> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: Array<{ tag: string; count: number; slug: string }>;
      }>('/posts/tags');

      if (response.success && response.data) {
        return Array.isArray(response.data) ? response.data : [];
      }

      return [];
    } catch (error) {
      console.error('Error fetching tags:', error);
      return [];
    }
  }

  async createCategory(name: string): Promise<{ category: string; slug: string }> {
    try {
      const response = await apiClient.post<{ category: string; slug: string }>('/posts/categories', { name });

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to create category');
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  async createTag(name: string): Promise<{ tag: string; slug: string }> {
    try {
      const response = await apiClient.post<{ tag: string; slug: string }>('/posts/tags', { name });

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to create tag');
    } catch (error) {
      console.error('Error creating tag:', error);
      throw error;
    }
  }
}

export const postsApi = new PostsApi();
