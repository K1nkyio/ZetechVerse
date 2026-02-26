import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { marketplaceApi, MarketplaceComment } from '@/api/marketplace.api';
import { Loader2, Send } from 'lucide-react';
import { apiClient } from '@/api/base';
import { useLocation, useNavigate } from 'react-router-dom';

interface CommentFormProps {
  listingId: string;
  onCommentAdded: (comment: MarketplaceComment) => void;
  parentCommentId?: string;
  placeholder?: string;
  className?: string;
}

export const CommentForm = ({
  listingId,
  onCommentAdded,
  parentCommentId,
  placeholder = "Write a comment...",
  className = ""
}: CommentFormProps) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const token = apiClient.getToken();
    if (!token) {
      toast({
        title: 'Login Required',
        description: 'Please log in to comment.',
        variant: 'destructive',
      });
      navigate('/login', { state: { from: location } });
      return;
    }

    if (!content.trim()) {
      toast({
        title: 'Comment required',
        description: 'Please write something before posting.',
        variant: 'destructive',
      });
      return;
    }

    if (content.length > 1000) {
      toast({
        title: 'Comment too long',
        description: 'Comments must be 1000 characters or less.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const newComment = await marketplaceApi.createComment(listingId, {
        content: content.trim(),
        parent_comment_id: parentCommentId,
      });

      setContent('');
      onCommentAdded(newComment);

      toast({
        title: 'Comment posted!',
        description: parentCommentId ? 'Your reply has been posted.' : 'Your comment has been posted.',
      });
    } catch (error: any) {
      console.error('Failed to post comment:', error);
      toast({
        title: 'Failed to post comment',
        description: error.response?.data?.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      <div className="flex gap-3">
        <Avatar className="w-8 h-8">
          <AvatarImage src="" alt="Your avatar" />
          <AvatarFallback className="text-xs">U</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            className="min-h-[80px] resize-none"
            disabled={isSubmitting}
            maxLength={1000}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {content.length}/1000 characters
            </span>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !content.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {parentCommentId ? 'Reply' : 'Comment'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};