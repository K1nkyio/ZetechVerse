import { apiClient, handleApiResponse } from './base';

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
  status: 'draft' | 'pending' | 'published' | 'rejected';
  author_id: number;
  author_username?: string;
  author_name?: string;
  author_avatar?: string;
  views_count: number;
  likes_count: number;
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
  private getFallbackPagination(limit: number): PostResponse['pagination'] {
    return { page: 1, limit, total: 0, pages: 0 };
  }

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
      const fallbackPagination = this.getFallbackPagination(options?.limit ?? 10);
      const response = await apiClient.get<Post[]>('/posts', options);

      if (response.data.success) {
        return {
          posts: response.data.data || [],
          pagination: response.data.pagination || fallbackPagination
        };
      }

      return { posts: [], pagination: fallbackPagination };
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }
  }

  async getPostById(id: string): Promise<Post> {
    try {
      const response = await apiClient.get<Post>(`/posts/${id}`);
      return handleApiResponse(response);
    } catch (error) {
      console.error('Error fetching post:', error);
      throw error;
    }
  }

  async getFeaturedPosts(limit: number = 6): Promise<Post[]> {
    try {
      const response = await apiClient.get<Post[]>(`/posts/featured`, { limit });

      if (response.data.success) {
        return response.data.data || [];
      }

      return [];
    } catch (error) {
      console.error('Error fetching featured posts:', error);
      throw error;
    }
  }

  async createPost(data: CreatePostData): Promise<Post> {
    try {
      const response = await apiClient.post<Post>('/posts', data);
      return handleApiResponse(response);
    } catch (error: unknown) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  async updatePost(id: string, data: Partial<CreatePostData>): Promise<Post> {
    try {
      const response = await apiClient.put<Post>(`/posts/${id}`, data);
      return handleApiResponse(response);
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  }

  async deletePost(id: string): Promise<void> {
    try {
      const response = await apiClient.delete<{ message: string }>(`/posts/${id}`);
      handleApiResponse(response);
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }

  async getMyPosts(options?: {
    page?: number;
    limit?: number;
    status?: 'draft' | 'pending' | 'published' | 'rejected' | 'all';
    sort_by?: string;
    sort_order?: 'ASC' | 'DESC';
  }): Promise<PostResponse> {
    try {
      const fallbackPagination = this.getFallbackPagination(options?.limit ?? 10);
      const response = await apiClient.get<Post[]>('/posts/user/my-posts', options);

      if (response.data.success) {
        return {
          posts: response.data.data || [],
          pagination: response.data.pagination || fallbackPagination
        };
      }

      return { posts: [], pagination: fallbackPagination };
    } catch (error) {
      console.error('Error fetching my posts:', error);
      throw error;
    }
  }

  async getCategories(): Promise<Array<{ category: string; count: number }>> {
    try {
      const response = await apiClient.get<Array<{ category: string; count: number }>>('/posts/categories');

      if (response.data.success) {
        return response.data.data || [];
      }

      return [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  async getReviewQueue(options?: {
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: 'ASC' | 'DESC';
  }): Promise<PostResponse> {
    try {
      const fallbackPagination = this.getFallbackPagination(options?.limit ?? 20);
      const response = await apiClient.get<Post[]>('/posts/admin/review-queue', options);

      if (response.data.success) {
        return {
          posts: response.data.data || [],
          pagination: response.data.pagination || fallbackPagination
        };
      }

      return { posts: [], pagination: fallbackPagination };
    } catch (error) {
      console.error('Error fetching review queue:', error);
      throw error;
    }
  }

  async reviewPost(id: string, action: 'approve' | 'reject'): Promise<Post> {
    try {
      const response = await apiClient.put<Post>(`/posts/${id}/review`, { action });
      return handleApiResponse(response);
    } catch (error) {
      console.error('Error reviewing post:', error);
      throw error;
    }
  }
}

export const postsApi = new PostsApi();
