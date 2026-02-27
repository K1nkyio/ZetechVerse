import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  MoreHorizontal, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Eye, 
  MessageSquare, 
  FileText, 
  ShoppingBag, 
  Search,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/api/base";

interface UnifiedComment {
  id: string | number;
  content: string;
  entity_type: 'confession' | 'marketplace' | 'blog_post';
  entity_id: string | number;
  entity_title?: string;
  user_id: string | number;
  author_username?: string;
  author_full_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at?: string;
  moderated_by?: string;
  moderated_at?: string;
  likes_count?: number;
  replies_count?: number;
  parent_comment_id?: string | number;
  [key: string]: unknown;
}

interface CommentManagerProps {
  variant: 'admin' | 'super-admin';
}

export function UnifiedCommentManager({ variant }: CommentManagerProps) {
  const { toast } = useToast();
  const [comments, setComments] = useState<UnifiedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [confessionFetchFailed, setConfessionFetchFailed] = useState(false);

  const normalizeEntityType = (rawType: unknown): UnifiedComment['entity_type'] | null => {
    const value = String(rawType || '').toLowerCase();
    if (value === 'blog_post' || value === 'blog' || value === 'post' || value === 'explore') return 'blog_post';
    if (value === 'confession') return 'confession';
    if (value === 'marketplace') return 'marketplace';
    return null;
  };

  const normalizeStatus = (rawStatus: unknown): UnifiedComment['status'] => {
    const value = String(rawStatus || '').toLowerCase();
    if (value === 'approved' || value === 'rejected' || value === 'pending') return value;
    return 'pending';
  };

  const getEntityTypeLabel = (type: UnifiedComment['entity_type']) => {
    if (type === 'blog_post') return 'Blog Post';
    if (type === 'confession') return 'Confession';
    if (type === 'marketplace') return 'Marketplace';
    return type;
  };
  
  // Calculate statistics
  const confessionComments = comments.filter(c => c.entity_type === 'confession');
  const marketplaceComments = comments.filter(c => c.entity_type === 'marketplace');
  const blogComments = comments.filter(c => c.entity_type === 'blog_post');
  const pendingConfessionComments = confessionComments.filter(c => c.status === 'pending');
  const pendingMarketplaceComments = marketplaceComments.filter(c => c.status === 'pending');
  const pendingBlogComments = blogComments.filter(c => c.status === 'pending');
  
  const [actionLoading, setActionLoading] = useState<Record<string | number, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<UnifiedComment | null>(null);
  const [moderationReason, setModerationReason] = useState('');

  // Fetch all comments from different sources
  const fetchAllComments = async () => {
    try {
      setLoading(true);
      setConfessionFetchFailed(false);

      const response = await apiClient.get('/comments/admin/comments', {
        limit: 200,
        status: 'all'
      });

      if (!response.data.success) {
        setConfessionFetchFailed(true);
        throw new Error(response.data.message || 'Failed to fetch comments');
      }

      const rows = Array.isArray(response.data.data) ? response.data.data : [];
      const allComments: UnifiedComment[] = rows
        .map((r: any) => {
          const entityType = normalizeEntityType(r.entity_type);
          if (!entityType) return null;

          return {
            id: r.id,
            content: r.content,
            entity_type: entityType,
            entity_id: r.entity_id,
            entity_title: r.entity_title,
            user_id: r.user_id,
            author_username: r.author_username,
            author_full_name: r.author_full_name,
            status: normalizeStatus(r.status),
            created_at: r.created_at,
            updated_at: r.updated_at
          } as UnifiedComment;
        })
        .filter((comment: UnifiedComment | null): comment is UnifiedComment => comment !== null);

      // Sort by created_at descending
      allComments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setComments(allComments);
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch comments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllComments();
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      fetchAllComments();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handleModerateComment = async (comment: UnifiedComment, action: 'approve' | 'reject') => {
    if (actionLoading[comment.id]) return;
    
    setActionLoading(prev => ({ ...prev, [comment.id]: true }));
    
    try {
      let response;

      if (comment.entity_type === 'marketplace') {
        response = await apiClient.put(`/marketplace-comments/comments/${comment.id}/moderate`, {
          status: action === 'approve' ? 'approved' : 'rejected'
        });
      } else {
        response = await apiClient.put(`/comments/comments/${comment.id}/moderate`, {
          status: action === 'approve' ? 'approved' : 'rejected'
        });
      }
      
      if (response && response.data.success) {
        if (response.data.success) {
          toast({
            title: action === 'approve' ? "Approved" : "Rejected",
            description: `Comment has been ${action}d successfully`,
          });
          
          // Optimistic update
          setComments(prev => prev.map(c => 
            c.id === comment.id 
              ? { ...c, status: action === 'approve' ? 'approved' : 'rejected', moderated_at: new Date().toISOString() }
              : c
          ));
          
          // Close dialog if it was open
          if (viewDialogOpen) {
            setViewDialogOpen(false);
            setModerationReason('');
          }
        } else {
          throw new Error(response.data.message || `Failed to ${action} comment`);
        }
      } else {
        throw new Error(response?.data?.message || `Failed to ${action} comment`);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${action} comment`,
        variant: "destructive",
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [comment.id]: false }));
    }
  };

  const handleDeleteComment = async (comment: UnifiedComment) => {
    if (actionLoading[comment.id]) return;
    
    setActionLoading(prev => ({ ...prev, [comment.id]: true }));
    
    try {
      let response;
      
      if (comment.entity_type === 'confession') {
        response = await apiClient.delete(`/confessions/admin/comments/${comment.id}`);
      } else if (comment.entity_type === 'marketplace') {
        response = await apiClient.delete(`/marketplace-comments/comments/${comment.id}`);
      } else {
        toast({
          title: "Not supported",
          description: "Delete is not available for this comment type.",
          variant: "destructive",
        });
        return;
      }
      
      if (response && response.data.success) {
        toast({
          title: "Deleted",
          description: "Comment has been deleted successfully",
        });
        
        // Remove from list
        setComments(prev => prev.filter(c => c.id !== comment.id));
        
        // Close dialog if it was open
        if (viewDialogOpen) {
          setViewDialogOpen(false);
        }
      } else {
        throw new Error(response?.data?.message || 'Failed to delete comment');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete comment",
        variant: "destructive",
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [comment.id]: false }));
    }
  };

  const getEntityTypeIcon = (type: UnifiedComment['entity_type']) => {
    switch (type) {
      case 'confession': return <MessageSquare className="h-4 w-4" />;
      case 'marketplace': return <ShoppingBag className="h-4 w-4" />;
      case 'blog_post': return <FileText className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getEntityTypeColor = (type: UnifiedComment['entity_type']) => {
    switch (type) {
      case 'confession': return 'bg-purple-100 text-purple-800';
      case 'marketplace': return 'bg-green-100 text-green-800';
      case 'blog_post': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: UnifiedComment['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter comments based on search and filters
  const filteredComments = comments.filter(comment => {
    const matchesStatus = statusFilter === 'all' || comment.status === statusFilter;
    const matchesType = typeFilter === 'all' || comment.entity_type === typeFilter;
    const matchesSearch = searchQuery === '' || 
      comment.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (comment.author_username && comment.author_username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (comment.entity_title && comment.entity_title.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesStatus && matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header and Statistics */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Comment Management</h1>
            <p className="text-muted-foreground">Review, approve, reject, and delete comments across all platform sections</p>
          </div>
          <Button 
            onClick={fetchAllComments}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Comments
          </Button>
        </div>

        {confessionFetchFailed && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Comments failed to load. Click "Refresh Comments" to retry.
          </div>
        )}
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <Card className="admin-card border-purple-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-600">Confession Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{confessionComments.length}</div>
              <p className="text-xs text-muted-foreground">
                {pendingConfessionComments.length} pending
              </p>
            </CardContent>
          </Card>
          
          <Card className="admin-card border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Marketplace Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{marketplaceComments.length}</div>
              <p className="text-xs text-muted-foreground">
                {pendingMarketplaceComments.length} pending
              </p>
            </CardContent>
          </Card>

          <Card className="admin-card border-sky-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-sky-600">Blog Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{blogComments.length}</div>
              <p className="text-xs text-muted-foreground">
                {pendingBlogComments.length} pending
              </p>
            </CardContent>
          </Card>
          
          <Card className="admin-card border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">Total Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{comments.length}</div>
              <p className="text-xs text-muted-foreground">
                {comments.filter(c => c.status === 'pending').length} pending total
              </p>
            </CardContent>
          </Card>
          
          <Card className="admin-card border-orange-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-600">Approved Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {comments.filter(c => c.status === 'approved').length}
              </div>
              <p className="text-xs text-muted-foreground">Successfully moderated</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions for Confession Comments */}
      {pendingConfessionComments.length > 0 && (
        <Card className="admin-card border-purple-300 bg-purple-50">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-purple-800">
              <MessageSquare className="h-5 w-5" />
              Pending Confession Comments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-purple-700">
                There are <span className="font-bold">{pendingConfessionComments.length}</span> confession comments waiting for moderation.
              </p>
              <Button 
                onClick={() => {
                  setTypeFilter('confession');
                  setStatusFilter('pending');
                }}
                className="bg-purple-600 hover:bg-purple-700"
              >
                View Pending Confessions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {pendingBlogComments.length > 0 && (
        <Card className="admin-card border-sky-300 bg-sky-50">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-sky-800">
              <FileText className="h-5 w-5" />
              Pending Blog Comments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sky-700">
                There are <span className="font-bold">{pendingBlogComments.length}</span> blog comments waiting for moderation.
              </p>
              <Button
                onClick={() => {
                  setTypeFilter('blog_post');
                  setStatusFilter('pending');
                }}
                className="bg-sky-600 hover:bg-sky-700"
              >
                View Pending Blog Comments
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Filters */}
      <Card className="admin-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Comments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search comments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="confession">Confessions</SelectItem>
                <SelectItem value="marketplace">Marketplace</SelectItem>
                <SelectItem value="blog_post">Blog Posts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Comments List */}
      <Card className="admin-card">
        <CardHeader>
          <CardTitle className="font-display">Comments ({filteredComments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading comments...</span>
            </div>
          ) : filteredComments.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No comments found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No comments available for moderation'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredComments.map((comment) => (
                <div key={comment.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getEntityTypeColor(comment.entity_type)}>
                          {getEntityTypeIcon(comment.entity_type)}
                          <span className="ml-1">{getEntityTypeLabel(comment.entity_type)}</span>
                        </Badge>
                        <Badge className={getStatusColor(comment.status)}>
                          {comment.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <p className="text-foreground mb-2 line-clamp-2">{comment.content}</p>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>By: {comment.author_full_name || comment.author_username || 'Anonymous'}</span>
                        {comment.entity_title && (
                          <span>On: {comment.entity_title}</span>
                        )}
                        {comment.likes_count !== undefined && (
                          <span>{comment.likes_count} likes</span>
                        )}
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem onClick={() => {
                          setSelectedComment(comment);
                          setViewDialogOpen(true);
                        }}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        
                        {comment.status === 'pending' && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleModerateComment(comment, 'approve')}
                              disabled={actionLoading[comment.id]}
                              className="text-green-600"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedComment(comment);
                                setModerationReason('');
                                setViewDialogOpen(true);
                              }}
                              disabled={actionLoading[comment.id]}
                              className="text-red-600"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </DropdownMenuItem>
                          </>
                        )}
                        
                        {comment.status === 'approved' && (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedComment(comment);
                              setModerationReason('');
                              setViewDialogOpen(true);
                            }}
                            disabled={actionLoading[comment.id]}
                            className="text-red-600"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </DropdownMenuItem>
                        )}
                        
                        {comment.status === 'rejected' && (
                          <DropdownMenuItem
                            onClick={() => handleModerateComment(comment, 'approve')}
                            disabled={actionLoading[comment.id]}
                            className="text-green-600"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuItem
                          onClick={() => handleDeleteComment(comment)}
                          disabled={actionLoading[comment.id]}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Comment Dialog */}
      <Dialog
        open={viewDialogOpen}
        onOpenChange={(open) => {
          setViewDialogOpen(open);
          if (!open) {
            setModerationReason('');
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Comment Details</DialogTitle>
          </DialogHeader>
          
          {selectedComment && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={getEntityTypeColor(selectedComment.entity_type)}>
                  {getEntityTypeIcon(selectedComment.entity_type)}
                  <span className="ml-1">{getEntityTypeLabel(selectedComment.entity_type)}</span>
                </Badge>
                <Badge className={getStatusColor(selectedComment.status)}>
                  {selectedComment.status}
                </Badge>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Content:</h4>
                <p className="text-foreground bg-muted p-3 rounded-lg">{selectedComment.content}</p>
              </div>
              
              {selectedComment.status === 'pending' && (
                <div>
                  <h4 className="font-medium mb-2">Rejection Reason</h4>
                  <Textarea
                    value={moderationReason}
                    onChange={(e) => setModerationReason(e.target.value)}
                    placeholder="Provide a short reason for rejection"
                    className="min-h-[90px]"
                  />
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-1">Author</h4>
                  <p className="text-muted-foreground">
                    {selectedComment.author_full_name || selectedComment.author_username || 'Anonymous'}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-1">Posted On</h4>
                  <p className="text-muted-foreground">
                    {new Date(selectedComment.created_at).toLocaleString()}
                  </p>
                </div>
                
                {selectedComment.entity_title && (
                  <div className="md:col-span-2">
                    <h4 className="font-medium mb-1">On Entity</h4>
                    <p className="text-muted-foreground">{selectedComment.entity_title}</p>
                  </div>
                )}
                
                {selectedComment.moderated_at && (
                  <div>
                    <h4 className="font-medium mb-1">Moderated</h4>
                    <p className="text-muted-foreground">
                      {new Date(selectedComment.moderated_at).toLocaleString()}
                    </p>
                  </div>
                )}
                
                {selectedComment.moderated_by && (
                  <div>
                    <h4 className="font-medium mb-1">Moderated By</h4>
                    <p className="text-muted-foreground">{selectedComment.moderated_by}</p>
                  </div>
                )}
              </div>
              
              {selectedComment.status !== 'pending' && (
                <div>
                  <h4 className="font-medium mb-2">Moderation Reason</h4>
                  <p className="text-muted-foreground">
                    {selectedComment.status === 'rejected' 
                      ? 'Comment was rejected during moderation'
                      : 'Comment was approved during moderation'}
                  </p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="gap-2">
            {selectedComment && selectedComment.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewDialogOpen(false);
                    setModerationReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (selectedComment) {
                      handleModerateComment(selectedComment, 'reject');
                    }
                  }}
                  disabled={actionLoading[selectedComment.id]}
                >
                  {actionLoading[selectedComment.id] ? 'Rejecting...' : 'Reject with Reason'}
                </Button>
                <Button
                  onClick={() => {
                    if (selectedComment) {
                      handleModerateComment(selectedComment, 'approve');
                    }
                  }}
                  disabled={actionLoading[selectedComment.id]}
                >
                  {actionLoading[selectedComment.id] ? 'Approving...' : 'Approve'}
                </Button>
              </>
            )}
            
            {selectedComment && selectedComment.status !== 'pending' && (
              <Button
                variant="outline"
                onClick={() => {
                  setViewDialogOpen(false);
                  setModerationReason('');
                }}
              >
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
