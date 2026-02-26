import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { marketplaceApi, MarketplaceComment, CommentResponse } from '@/api/marketplace.api';
import { CommentForm } from './CommentForm';
import { CommentItem } from './CommentItem';
import { MessageCircle, Loader2 } from 'lucide-react';
import { apiClient } from '@/api/base';
import { useNavigate, useLocation } from 'react-router-dom';

interface CommentListProps {
  listingId: string;
  currentUserId?: string;
  className?: string;
}

export const CommentList = ({
  listingId,
  currentUserId,
  className = ""
}: CommentListProps) => {
  const [comments, setComments] = useState<MarketplaceComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<CommentResponse['pagination'] | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<MarketplaceComment | null>(null);
  const [repliesVisibility, setRepliesVisibility] = useState<Record<string, boolean>>({});
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({});
  const [likingMap, setLikingMap] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const fetchComments = useCallback(async (page = 1, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const response = await marketplaceApi.getTopLevelComments(listingId, {
        page,
        limit: 10,
        status: 'approved',
        sort_by: 'created_at',
        sort_order: 'DESC'
      });

      if (append) {
        setComments(prev => [...prev, ...response.comments]);
      } else {
        setComments(response.comments);
      }

      setPagination(response.pagination);
    } catch (error: any) {
      console.error('Failed to fetch comments:', error);
      toast({
        title: 'Failed to load comments',
        description: error.response?.data?.message || 'Something went wrong.',
        variant: 'destructive',
      });
      // Ensure comments is set to empty array on error
      if (!append) {
        setComments([]);
        setPagination(null);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [listingId, toast]);

  const fetchReplies = useCallback(async (commentId: string) => {
    if (loadingReplies[commentId]) return;

    setLoadingReplies(prev => ({ ...prev, [commentId]: true }));

    try {
      const response = await marketplaceApi.getCommentReplies(commentId, {
        status: 'approved',
        sort_by: 'created_at',
        sort_order: 'ASC'
      });

      // Update the comment with replies
      setComments(prev => prev.map(comment =>
        comment.id === commentId
          ? { ...comment, replies: response.comments }
          : comment
      ));
    } catch (error: any) {
      console.error('Failed to fetch replies:', error);
      toast({
        title: 'Failed to load replies',
        description: error.response?.data?.message || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setLoadingReplies(prev => ({ ...prev, [commentId]: false }));
    }
  }, [loadingReplies, toast]);

  // Debounced reconciliation to avoid 429 after bursts
  const [reconcileTimer, setReconcileTimer] = useState<number | null>(null);
  const scheduleReconcile = (delay = 800) => {
    if (reconcileTimer) {
      window.clearTimeout(reconcileTimer);
    }
    const t = window.setTimeout(() => {
      if (pagination?.page) {
        fetchComments(pagination.page, false);
      } else {
        fetchComments(1, false);
      }
      setReconcileTimer(null);
    }, delay);
    setReconcileTimer(t);
  };

  useEffect(() => {
    fetchComments();
    return () => {
      if (reconcileTimer) window.clearTimeout(reconcileTimer);
    };
  }, [fetchComments]);

  const handleCommentAdded = (newComment: MarketplaceComment) => {
    if (newComment.parent_comment_id) {
      // It's a reply - add to the parent comment's replies
      setComments(prev => prev.map(comment =>
        comment.id === newComment.parent_comment_id
          ? {
              ...comment,
              replies: [...(comment.replies || []), newComment],
              replies_count: (comment.replies_count || 0) + 1
            }
          : comment
      ));
    } else {
      // It's a top-level comment - add to the list
      setComments(prev => [newComment, ...prev]);
    }
    setReplyingTo(null);
  };

  const handleReply = (comment: MarketplaceComment) => {
    setReplyingTo(comment.id);
    setEditingComment(null);
  };

  const handleEdit = (comment: MarketplaceComment) => {
    setEditingComment(comment);
    setReplyingTo(null);
  };

  const handleDelete = (commentId: string) => {
    setComments(prev => prev.filter(comment => comment.id !== commentId));
  };

  // Toggle like with optimistic update and background reconciliation
  const handleLike = async (commentId: string) => {
    // Require auth
    const token = apiClient.getToken?.();
    if (!token) {
      toast({ title: 'Login required', description: 'Please log in to like comments.', variant: 'destructive' });
      navigate('/login', { state: { from: location } });
      return;
    }

    if (likingMap[commentId]) return;

    const target = comments.find(c => c.id === commentId);
    if (!target) return;

    const likedByMe = (target as any).likedByMe === true;

    // Enforce single like per user: if already liked, do nothing
    if (likedByMe) {
      toast({ title: 'Already liked', description: 'You can like a comment only once.' });
      return;
    }

    // Optimistic like once
    setComments(prev => prev.map(c =>
      c.id === commentId
        ? { ...c, likes_count: c.likes_count + 1, likedByMe: true }
        : c
    ));
    setLikingMap(prev => ({ ...prev, [commentId]: true }));

    try {
      await marketplaceApi.likeComment(commentId);
    } catch (error: any) {
      // Revert on failure
      setComments(prev => prev.map(c =>
        c.id === commentId
          ? { ...c, likes_count: Math.max(0, c.likes_count - 1), likedByMe: false }
          : c
      ));
      toast({
        title: 'Failed to like comment',
        description: error?.response?.data?.message || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setLikingMap(prev => ({ ...prev, [commentId]: false }));
      // Debounced reconciliation to reduce refetch frequency
      scheduleReconcile(900);
    }
  };

  const handleToggleReplies = async (commentId: string) => {
    const isVisible = repliesVisibility[commentId];

    if (!isVisible) {
      // Show replies
      setRepliesVisibility(prev => ({ ...prev, [commentId]: true }));

      // Fetch replies if not already loaded
      const comment = comments?.find(c => c.id === commentId);
      if (comment && !comment.replies) {
        await fetchReplies(commentId);
      }
    } else {
      // Hide replies
      setRepliesVisibility(prev => ({ ...prev, [commentId]: false }));
    }
  };

  const handleLoadMore = () => {
    if (pagination && pagination.page < pagination.pages) {
      fetchComments(pagination.page + 1, true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Comment Form */}
      <CommentForm
        listingId={listingId}
        onCommentAdded={handleCommentAdded}
      />

      <Separator />

      {/* Comments Header */}
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5" />
        <h3 className="font-semibold">
          Comments ({pagination?.total || 0})
        </h3>
      </div>

      {/* Comments List */}
      {(!comments || comments.length === 0) ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.id} className="space-y-4">
              <CommentItem
                comment={comment}
                currentUserId={currentUserId}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onLike={handleLike}
                showReplies={repliesVisibility[comment.id]}
                onToggleReplies={() => handleToggleReplies(comment.id)}
                replies={comment.replies}
                isLoadingReplies={loadingReplies[comment.id]}
              />

              {/* Reply Form */}
              {replyingTo === comment.id && (
                <div className="ml-11">
                  <CommentForm
                    listingId={listingId}
                    onCommentAdded={handleCommentAdded}
                    parentCommentId={comment.id}
                    placeholder={`Reply to ${comment.full_name || comment.username}...`}
                  />
                </div>
              )}
            </div>
          ))}

          {/* Load More Button */}
          {pagination && pagination.page < pagination.pages && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Load More Comments
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};