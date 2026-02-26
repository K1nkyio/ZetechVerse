import { apiClient } from './base';

export interface Comment {
  id: string;
  content: string;
  post_id?: string;
  user_id: string;
  author_name?: string;  // deprecated, use author_username instead
  author_username?: string;
  author_full_name?: string;
  author_avatar?: string;
  parent_id?: string;
  likes_count: number;
  replies_count: number;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  status: 'approved' | 'pending' | 'rejected';
}

export interface CommentsResponse {
  comments: Comment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CreateCommentData {
  content: string;
  post_id: string;
  parent_id?: string;
}

export interface UpdateCommentData {
  content: string;
}

class CommentsApi {
  async getCommentsByPost(
    postId: string, 
    options?: {
      page?: number;
      limit?: number;
      sort_by?: string;
      sort_order?: 'ASC' | 'DESC';
    }
  ): Promise<CommentsResponse> {
    try {
      // Temporarily return empty comments since backend doesn't have post comments yet
      console.warn('Comments for blog posts are not yet implemented in the backend');
      return { comments: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } };
    } catch (error) {
      console.error('Error fetching comments:', error);
      return { comments: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } };
    }
  }

  async getCommentById(id: string): Promise<Comment> {
    try {
      // Temporarily return a mock comment since backend doesn't have post comments yet
      console.warn('Comments for blog posts are not yet implemented in the backend');
      return {
        id: id,
        content: 'Mock comment for testing',
        post_id: '1',
        user_id: '1',
        author_name: 'Anonymous User',
        likes_count: 0,
        replies_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_edited: false,
        status: 'approved'
      };
    } catch (error) {
      console.error('Error fetching comment:', error);
      throw error;
    }
  }

  async createComment(data: CreateCommentData): Promise<Comment> {
    try {
      // Temporarily return a mock comment since backend doesn't have post comments yet
      console.warn('Comments for blog posts are not yet implemented in the backend');
      return {
        id: Date.now().toString(),
        content: data.content,
        post_id: data.post_id,
        user_id: '1',
        author_name: 'Anonymous User',
        likes_count: 0,
        replies_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_edited: false,
        status: 'approved'
      };
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  }

  async updateComment(id: string, data: UpdateCommentData): Promise<Comment> {
    try {
      // Temporarily return a mock comment since backend doesn't have post comments yet
      console.warn('Comments for blog posts are not yet implemented in the backend');
      return {
        id: id,
        content: data.content,
        post_id: '1',
        user_id: '1',
        author_name: 'Anonymous User',
        likes_count: 0,
        replies_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_edited: true,
        status: 'approved'
      };
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  }

  async deleteComment(id: string): Promise<void> {
    try {
      // Temporarily do nothing since backend doesn't have post comments yet
      console.warn('Comments for blog posts are not yet implemented in the backend');
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }

  async likeComment(commentId: string): Promise<void> {
    try {
      // Temporarily do nothing since backend doesn't have post comments yet
      console.warn('Comments for blog posts are not yet implemented in the backend');
    } catch (error) {
      console.error('Error liking comment:', error);
      throw error;
    }
  }

  async unlikeComment(commentId: string): Promise<void> {
    try {
      // Temporarily do nothing since backend doesn't have post comments yet
      console.warn('Comments for blog posts are not yet implemented in the backend');
    } catch (error) {
      console.error('Error unliking comment:', error);
      throw error;
    }
  }
}

export const commentsApi = new CommentsApi();