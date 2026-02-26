import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { marketplaceApi, MarketplaceComment } from '@/api/marketplace.api';
import {
  Heart,
  MessageCircle,
  MoreVertical,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { apiClient } from '@/api/base';
import { useLocation, useNavigate } from 'react-router-dom';

interface CommentItemProps {
  comment: MarketplaceComment;
  currentUserId?: string;
  onReply?: (comment: MarketplaceComment) => void;
  onEdit?: (comment: MarketplaceComment) => void;
  onDelete?: (commentId: string) => void;
  onLike?: (commentId: string) => void;
  showReplies?: boolean;
  onToggleReplies?: () => void;
  replies?: MarketplaceComment[];
  isLoadingReplies?: boolean;
  className?: string;
}

export const CommentItem = ({
  comment,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onLike,
  showReplies = false,
  onToggleReplies,
  replies = [],
  isLoadingReplies = false,
  className = ""
}: CommentItemProps) => {
  const [isLiking, setIsLiking] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const likedByMe = (comment as any).likedByMe === true;

  const isOwner = currentUserId && comment.user_id === currentUserId;
  const displayName = comment.full_name || comment.username || 'Anonymous';
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true });

  const handleToggleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      await onLike?.(comment.id);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    const token = apiClient.getToken();
    if (!token) {
      toast({
        title: 'Login Required',
        description: 'Please log in to delete comments.',
        variant: 'destructive',
      });
      navigate('/login', { state: { from: location } });
      return;
    }

    try {
      await marketplaceApi.deleteComment(comment.id);
      onDelete?.(comment.id);
      toast({
        title: 'Comment deleted',
        description: 'Your comment has been deleted.',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to delete comment',
        description: error.response?.data?.message || 'Something went wrong.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex gap-3">
        <Avatar className="w-8 h-8">
          <AvatarImage src={comment.avatar_url} alt={displayName} />
          <AvatarFallback className="text-xs">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{displayName}</span>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
            {comment.status === 'pending' && (
              <Badge variant="secondary" className="text-xs">
                Pending
              </Badge>
            )}
          </div>

          <p className="text-sm leading-relaxed">{comment.content}</p>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={isLiking ? undefined : handleToggleLike}
              disabled={isLiking}
              className={`h-8 px-2 ${likedByMe ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}
            >
              {isLiking ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <Heart className={`w-3 h-3 mr-1 ${likedByMe ? 'fill-current' : ''}`} />
              )}
              {comment.likes_count}
            </Button>

            {onReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReply(comment)}
                className="h-8 px-2 text-muted-foreground hover:text-blue-500"
              >
                <MessageCircle className="w-3 h-3 mr-1" />
                Reply
              </Button>
            )}

            {comment.replies_count && comment.replies_count > 0 && onToggleReplies && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleReplies}
                className="h-8 px-2 text-muted-foreground"
              >
                {showReplies ? (
                  <ChevronUp className="w-3 h-3 mr-1" />
                ) : (
                  <ChevronDown className="w-3 h-3 mr-1" />
                )}
                {comment.replies_count} {comment.replies_count === 1 ? 'reply' : 'replies'}
              </Button>
            )}

            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(comment)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {showReplies && replies.length > 0 && (
        <div className="ml-11 space-y-3 border-l-2 border-muted pl-4">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onLike={onLike}
            />
          ))}
        </div>
      )}

      {showReplies && isLoadingReplies && (
        <div className="ml-11 flex items-center justify-center py-2">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
};