import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/ui/page-header';
import { trackEvent } from '@/lib/analytics';
import {
  MessageCircle,
  Heart,
  Share2,
  Flag,
  TrendingUp,
  Clock,
  Flame,
  Send,
  User,
  Loader,
  Lock
} from 'lucide-react';
import { confessionsApi, type Confession, type ConfessionComment } from '@/api/confessions.api';
import { apiClient } from '@/api/base';

const categories = [
  { id: 'all', name: 'All', icon: MessageCircle },
  { id: 'trending', name: 'Trending', icon: TrendingUp },
  { id: 'new', name: 'New', icon: Clock },
  { id: 'hot', name: 'Hot', icon: Flame },
];

type ConfessionsPagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

const Confessions = () => {
  const location = useLocation();
  const confessionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [activeCategory, setActiveCategory] = useState('all');
  const [newConfession, setNewConfession] = useState('');
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<ConfessionsPagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [likingMap, setLikingMap] = useState<Record<number, boolean>>({});

  // Comment modal state
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [selectedConfession, setSelectedConfession] = useState<Confession | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [commentAnonymous, setCommentAnonymous] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  // New state for comments
  const [comments, setComments] = useState<ConfessionComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsPagination, setCommentsPagination] = useState<ConfessionsPagination | null>(null);
  const [commentsPage, setCommentsPage] = useState(1);
  const [showCommentsOnly, setShowCommentsOnly] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportingConfession, setReportingConfession] = useState<Confession | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const fetchDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { toast } = useToast();
  const navigate = useNavigate();

  const requireAuth = (actionText: string) => {
    const token = apiClient.getToken?.();
    if (!token) {
      toast({
        title: 'Login required',
        description: `Please log in to ${actionText}.`,
        variant: 'destructive'
      });
      navigate('/login', { state: { from: location } });
      return false;
    }
    return true;
  };

  const fetchConfessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await confessionsApi.getConfessions({
        status: 'approved',
        limit: 100
      });
      setConfessions(response.confessions);
      setPagination(response.pagination);
    } catch (err: unknown) {
      console.error('Failed to fetch confessions:', err);
      setError('Failed to load confessions');
      toast({
        title: 'Error',
        description: 'Failed to load confessions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchConfessions();
  }, [fetchConfessions]);

  const scheduleFetchConfessions = useCallback(() => {
    if (fetchDebounceTimerRef.current) {
      clearTimeout(fetchDebounceTimerRef.current);
    }
    fetchDebounceTimerRef.current = setTimeout(() => {
      void fetchConfessions();
    }, 1000);
  }, [fetchConfessions]);

  useEffect(() => {
    return () => {
      if (fetchDebounceTimerRef.current) {
        clearTimeout(fetchDebounceTimerRef.current);
      }
    };
  }, []);

  const handlePostConfession = async () => {
    if (!requireAuth('post confessions')) return;

    const trimmedContent = newConfession.trim();
    
    if (!trimmedContent) {
      toast({
        title: 'Error',
        description: 'Please write a confession',
        variant: 'destructive',
      });
      return;
    }

    if (trimmedContent.length < 10) {
      toast({
        title: 'Error',
        description: 'Confession must be at least 10 characters',
        variant: 'destructive',
      });
      return;
    }

    if (trimmedContent.length > 2000) {
      toast({
        title: 'Error',
        description: 'Confession must be no more than 2000 characters',
        variant: 'destructive',
      });
      return;
    }

    try {
      await confessionsApi.createConfession({
        content: trimmedContent,
        is_anonymous: true
      });
      setNewConfession('');
      toast({
        title: 'Success',
        description: 'Confession posted successfully! It will appear after moderation.',
      });
      void fetchConfessions();
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: getErrorMessage(err, 'Failed to post confession'),
        variant: 'destructive',
      });
    }
  };

  const handleLike = async (confession: Confession) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast({
        title: 'Offline',
        description: 'You appear to be offline. Please reconnect and try again.',
        variant: 'destructive'
      });
      return;
    }
    const token = apiClient.getToken?.();
    if (!token) {
      toast({ title: 'Login required', description: 'Please log in to like confessions.', variant: 'destructive' });
      navigate('/login', { state: { from: location } });
      return;
    }

    if (likingMap[confession.id]) return;

    // Optimistic UI update based on current state
    const isCurrentlyLiked = confession.likedByMe;
    const newLikesCount = isCurrentlyLiked 
      ? Math.max(0, (confession.likes_count || 0) - 1)
      : (confession.likes_count || 0) + 1;

    setConfessions(prev => prev.map(c =>
      c.id === confession.id 
        ? { ...c, likes_count: newLikesCount, likedByMe: !isCurrentlyLiked } 
        : c
    ));
    setLikingMap(prev => ({ ...prev, [confession.id]: true }));

    try {
      const response = await confessionsApi.likeConfession(confession.id);

      const serverLikes = typeof response.likes_count === 'number' ? response.likes_count : newLikesCount;

      setConfessions(prev => prev.map(c =>
        c.id === confession.id
          ? { ...c, likedByMe: response.liked, likes_count: serverLikes }
          : c
      ));
      
      toast({
        title: response.liked ? 'Liked' : 'Unliked',
        description: response.message || `Confession ${response.liked ? 'liked' : 'unliked'} successfully`,
      });
    } catch (error: unknown) {
      // Revert optimistic update on error
      setConfessions(prev => prev.map(c =>
        c.id === confession.id 
          ? { ...c, likes_count: confession.likes_count || 0, likedByMe: confession.likedByMe } 
          : c
      ));
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'Failed to update like status'),
        variant: 'destructive',
      });
    } finally {
      setLikingMap(prev => ({ ...prev, [confession.id]: false }));
      // Use debounced fetch instead of immediate fetch to reduce API calls
      scheduleFetchConfessions();
    }
  };

  const handleShare = async (confession: Confession) => {
    const url = `${window.location.origin}/confessions?highlight=${confession.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Campus Confession',
          text: 'Check out this confession',
          url: url,
        });
      } catch (error) {
        // User cancelled share or error occurred
        copyToClipboard(url);
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Link copied!',
        description: 'Confession link copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Share',
        description: `Share this link: ${text}`,
      });
    }
  };

  const handleCommentClick = (confession: Confession, showCommentsOnlyFlag: boolean = false) => {
    setSelectedConfession(confession);
    setShowCommentsOnly(showCommentsOnlyFlag);
    setCommentContent('');
    setCommentAnonymous(true);
    setCommentsPage(1);
    setCommentModalOpen(true);
    fetchComments(confession.id, 1, false);
  };

  const openReportDialog = (confession: Confession) => {
    setReportingConfession(confession);
    setReportReason('');
    setReportDetails('');
    setReportDialogOpen(true);
  };

  const submitReport = async () => {
    if (!reportingConfession) return;
    if (!requireAuth('report confessions')) return;

    if (!reportingConfession || !reportReason.trim()) {
      toast({
        title: 'Reason required',
        description: 'Please describe why this confession should be reviewed.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await confessionsApi.reportConfession(reportingConfession.id, {
        reason: reportReason,
        details: reportDetails || undefined,
      });
      trackEvent('confession_report_submitted', {
        confessionId: reportingConfession.id,
        reason: reportReason,
        details: reportDetails,
      });
      toast({
        title: 'Report submitted',
        description: result.report_count >= 3
          ? 'This confession has reached the community review threshold.'
          : 'Moderators will review this report shortly.',
      });
      setReportDialogOpen(false);
      setReportReason('');
      setReportDetails('');
    } catch (error: unknown) {
      toast({
        title: 'Report failed',
        description: getErrorMessage(error, 'Could not submit this report.'),
        variant: 'destructive',
      });
    }
  };

  const fetchComments = async (confessionId: number, page: number = 1, append: boolean = false) => {
    setLoadingComments(true);
    try {
      const response = await confessionsApi.getConfessionComments(confessionId, { page, limit: 10 });
      const newComments = response.comments || [];
      setCommentsPagination(response.pagination || null);
      setCommentsPage(page);
      setComments(prev => append ? [...prev, ...newComments] : newComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load comments',
        variant: 'destructive',
      });
      setComments([]);
      setCommentsPagination(null);
      setCommentsPage(1);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentContent.trim() || !selectedConfession) return;

    if (!requireAuth('comment')) return;

    try {
      setSubmittingComment(true);
      const created = await confessionsApi.addConfessionComment(selectedConfession.id, {
        content: commentContent.trim(),
        is_anonymous: commentAnonymous
      });

      toast({
        title: 'Comment submitted!',
        description: 'Your comment will appear after moderation.',
      });

      // Update comment count
      setConfessions(prev =>
        prev.map(c =>
          c.id === selectedConfession.id
            ? { ...c, comments_count: c.comments_count + 1 }
            : c
        )
      );

      setSelectedConfession((prev) =>
        prev && prev.id === selectedConfession.id
          ? { ...prev, comments_count: (prev.comments_count || 0) + 1 }
          : prev
      );

      const optimisticComment = {
        id: created?.id ?? `pending-${Date.now()}`,
        confession_id: selectedConfession.id,
        content: commentContent.trim(),
        is_anonymous: commentAnonymous,
        status: 'pending',
        created_at: new Date().toISOString(),
        author_username: 'You',
        author_full_name: 'You'
      };

      setComments(prev => [...prev, optimisticComment]);

      // If we're showing comments, refresh the list
      if (showCommentsOnly) {
        fetchComments(selectedConfession.id, 1, false);
      }

      // Clear the form
      setCommentContent('');
      setCommentAnonymous(true);
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'Failed to submit comment'),
        variant: 'destructive',
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  const sortedConfessions = [...confessions].sort((a, b) => {
    if (activeCategory === 'trending') return (b.likes_count || 0) - (a.likes_count || 0);
    if (activeCategory === 'hot') return b.is_hot ? 1 : -1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // 'all' and 'new' by date
  });

  // Scroll to highlighted confession
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const highlightId = params.get('highlight');
    
    if (highlightId && confessionRefs.current[highlightId]) {
      // Scroll to the highlighted confession after a short delay to ensure DOM is rendered
      setTimeout(() => {
        confessionRefs.current[highlightId]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        
        // Add a temporary highlight effect
        const element = confessionRefs.current[highlightId];
        if (element) {
          element.classList.add('ring-2', 'ring-primary', 'ring-opacity-50');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-primary', 'ring-opacity-50');
          }, 3000);
        }
      }, 100);
    }
  }, [location.search, confessions]);

  // Cleanup effect - no longer needed with debounced approach
  // useEffect(() => {
  //   return () => {
  //     if (reconcileTimer) window.clearTimeout(reconcileTimer);
  //   };
  // }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Hero */}
        <PageHeader
          title="Campus Confessions"
          centered
          icon={<MessageCircle className="h-6 w-6 text-primary" aria-hidden="true" />}
          description="Share your thoughts anonymously. Discuss, vent, and connect with fellow students."
        />

        {/* Post New Confession */}
        <div className="max-w-2xl mx-auto mb-6 sm:mb-8">
          <div className="bg-card rounded-xl sm:rounded-2xl border border-border p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <span className="font-medium text-sm sm:text-base">Anonymous</span>
            </div>
            <Textarea
              placeholder="What's on your mind? Share your confession..."
              className="min-h-[100px] resize-none mb-4"
              value={newConfession}
              onChange={(e) => setNewConfession(e.target.value)}
            />
            <div className="mb-4 rounded-lg border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
              Anonymous to the community, accountable to moderation. High-risk or abusive content is auto-prioritized for review.
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Your identity is protected. Posts are moderated.</p>
                <p className={`${newConfession.length < 10 && newConfession.length > 0 ? 'text-orange-500' : newConfession.length >= 10 ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {newConfession.length}/2000 characters (min 10)
                </p>
              </div>
              <Button 
                className="gap-2" 
                onClick={handlePostConfession} 
                disabled={newConfession.trim().length < 10}
              >
                <Send className="h-4 w-4" />
                Post Anonymously
              </Button>
            </div>
          </div>
        </div>

        {/* Categories */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-8 flex justify-center">
          <TabsList className="flex-wrap h-auto gap-2 bg-transparent p-0">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4"
                >
                  <Icon className="h-4 w-4" />
                  {cat.name}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-16">
            <p className="text-destructive">{error}</p>
            <Button onClick={fetchConfessions} className="mt-4">
              Try Again
            </Button>
          </div>
        )}

        {/* Confessions Feed */}
        {!loading && !error && (
          <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4">
            {sortedConfessions.map((confession) => (
              <div
                key={confession.id}
                ref={(el) => { confessionRefs.current[confession.id] = el; }}
                className="bg-card rounded-xl sm:rounded-2xl border border-border p-4 sm:p-6 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div>
                      <span className="font-medium text-sm sm:text-base">Anonymous</span>
                      <p className="text-xs text-muted-foreground">
                        {new Date(confession.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Badge variant="secondary" className="text-[10px] sm:text-xs">Approved</Badge>
                    {confession.is_hot && (
                      <Badge variant="destructive" className="gap-1 text-xs">
                        <Flame className="h-3 w-3" />
                        Hot
                      </Badge>
                    )}
                  </div>
                </div>

                <p className="text-foreground leading-relaxed mb-3 sm:mb-4 text-sm sm:text-base">
                  {confession.content}
                </p>

                <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-border">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`gap-1 sm:gap-2 ${confession.likedByMe ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'} h-8 sm:h-9 px-2 sm:px-3`}
                      onClick={() => handleLike(confession)}
                      disabled={!!likingMap[confession.id]}
                    >
                      <Heart className={`h-3 w-3 sm:h-4 sm:w-4 ${confession.likedByMe ? 'fill-current' : ''}`} />
                      <span className="text-xs sm:text-sm">{confession.likes_count || 0}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 sm:gap-2 text-muted-foreground hover:text-primary h-8 sm:h-9 px-2 sm:px-3"
                      onClick={() => handleCommentClick(confession, false)}
                    >
                      <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="text-xs sm:text-sm hidden sm:inline">{confession.comments_count || 0}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 sm:gap-2 text-muted-foreground hover:text-primary h-8 sm:h-9 px-2 sm:px-3"
                      onClick={() => handleShare(confession)}
                    >
                      <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive h-8 sm:h-9 px-2"
                    onClick={() => openReportDialog(confession)}
                    aria-label="Report confession"
                  >
                    <Flag className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>

              </div>
            ))}
            {sortedConfessions.length === 0 && (
              <div className="text-center py-16">
                <p className="text-muted-foreground">No confessions yet. Be the first to share!</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Redesigned Comment Modal */}
      <Dialog open={commentModalOpen} onOpenChange={(open) => {
        setCommentModalOpen(open);
        if (!open) {
          setSelectedConfession(null);
          setComments([]);
          setCommentsPagination(null);
          setCommentsPage(1);
          setShowCommentsOnly(false);
        }
      }}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 py-3">
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Comments
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              View and add comments to this confession. Only approved comments are visible publicly.
            </DialogDescription>
          </DialogHeader>

          <Separator />

          <ScrollArea className="h-[48vh]">
            <div className="p-4 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm font-semibold leading-none tracking-normal">
                        Anonymous
                      </CardTitle>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {selectedConfession?.created_at
                          ? new Date(selectedConfession.created_at).toLocaleString()
                          : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5" />
                        {selectedConfession?.likes_count || 0}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="h-3.5 w-3.5" />
                        {selectedConfession?.comments_count || 0}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed">
                  {selectedConfession?.content}
                </CardContent>
              </Card>

              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Community</div>
                <div className="text-xs text-muted-foreground">
                  {Math.max(commentsPagination?.total ?? 0, comments.length)} comment(s)
                </div>
              </div>

              {loadingComments ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <Card key={idx}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-3 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-5/6" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <div className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <MessageCircle className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="text-sm font-medium">No comments yet</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Start the conversation with a respectful response.
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <Card key={comment.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium truncate">
                                {comment.is_anonymous
                                  ? 'Anonymous'
                                  : (comment.author_full_name || comment.author_username || 'Member')}
                              </div>
                              {comment.is_anonymous && (
                                <Badge variant="secondary" className="text-[10px] px-2 py-0">
                                  Anonymous
                                </Badge>
                              )}
                              {comment.status === 'pending' && (
                                <Badge variant="outline" className="text-[10px] px-2 py-0">
                                  Pending review
                                </Badge>
                              )}
                              {comment.status === 'rejected' && (
                                <Badge variant="destructive" className="text-[10px] px-2 py-0">
                                  Rejected
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {new Date(comment.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="text-sm leading-relaxed">
                        {comment.content}
                      </CardContent>
                    </Card>
                  ))}

                  {commentsPagination && commentsPagination.page < commentsPagination.pages && (
                    <div className="flex justify-center pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchComments(selectedConfession?.id, commentsPage + 1, true)}
                        disabled={loadingComments}
                      >
                        {loadingComments ? (
                          <>
                            <Loader className="h-4 w-4 animate-spin mr-2" />
                            Loading
                          </>
                        ) : (
                          'Load more'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          {!showCommentsOnly && (
            <>
              <Separator />
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="comment-content" className="text-sm">
                    Your comment
                  </Label>
                  <Textarea
                    id="comment-content"
                    placeholder="Write something respectful..."
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div>{commentContent.length}/500</div>
                    <div className="inline-flex items-center gap-1">
                      <Lock className="h-3.5 w-3.5" />
                      Your identity can be hidden
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="anonymous-comment"
                      checked={commentAnonymous}
                      onCheckedChange={(checked) => setCommentAnonymous(checked as boolean)}
                    />
                    <Label htmlFor="anonymous-comment" className="text-sm cursor-pointer">
                      Post anonymously
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setCommentModalOpen(false)}
                      disabled={submittingComment}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitComment}
                      disabled={!commentContent.trim() || submittingComment}
                      className="gap-2"
                    >
                      {submittingComment ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin" />
                          Posting
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Post
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report confession</DialogTitle>
            <DialogDescription>
              Tell moderators why this content should be reviewed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="report-reason">Reason</Label>
            <Textarea
              id="report-reason"
              placeholder="Harassment, hate speech, spam, misinformation..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={2}
            />
            <Label htmlFor="report-details">Additional details (optional)</Label>
            <Textarea
              id="report-details"
              placeholder="Add context to help moderators review quickly."
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitReport}>Submit report</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Confessions;
