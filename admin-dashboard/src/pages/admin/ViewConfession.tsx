import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { confessionsApi, type Confession } from "@/api/confessions.api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Calendar,
  User,
  UserCheck,
  Heart,
  MessageSquare,
  Share,
  Star,
  CheckCircle,
  XCircle,
  Flag,
  Trash2
} from "lucide-react";

export default function AdminViewConfession() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [confession, setConfession] = useState<Confession | null>(null);
  const [loading, setLoading] = useState(true);
  const [moderationReason, setModerationReason] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const isSuperAdmin = location.pathname.startsWith("/super-admin");
  const layoutVariant = isSuperAdmin ? "super-admin" : "admin";
  const confessionsPath = isSuperAdmin ? "/super-admin/confessions" : "/admin/confessions";

  useEffect(() => {
    if (id) {
      fetchConfession();
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchComments();
    }
  }, [id]);

  const fetchConfession = async () => {
    try {
      setLoading(true);
      const data = await confessionsApi.getConfession(parseInt(id!));
      setConfession(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load confession",
        variant: "destructive",
      });
      navigate(confessionsPath);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      if (!id) {
        setComments([]);
        return;
      }

      const result = await confessionsApi.getConfessionComments({
        confession_id: parseInt(id),
        status: 'all',
        limit: 200,
        page: 1
      });
      setComments(result.comments || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load confession comments",
        variant: "destructive",
      });
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleModerateComment = async (commentId: number, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await confessionsApi.approveConfessionComment(commentId);
        toast({ title: 'Approved', description: 'Comment approved successfully' });
      } else {
        await confessionsApi.rejectConfessionComment(commentId);
        toast({ title: 'Rejected', description: 'Comment rejected successfully' });
      }
      fetchComments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${action} comment`,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await confessionsApi.deleteConfessionComment(commentId);
      toast({ title: 'Deleted', description: 'Comment deleted successfully' });
      fetchComments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete comment',
        variant: 'destructive',
      });
    }
  };

  const handleModerate = async (action: string) => {
    if (!confession) return;

    try {
      let updatedConfession: Confession;

      switch (action) {
        case 'approve':
          updatedConfession = await confessionsApi.approveConfession(confession.id);
          toast({
            title: "Approved",
            description: "Confession has been approved and published",
          });
          break;
        case 'reject':
          if (!moderationReason.trim()) {
            toast({
              title: "Required",
              description: "Please provide a reason for rejection",
              variant: "destructive",
            });
            return;
          }
          updatedConfession = await confessionsApi.rejectConfession(confession.id, moderationReason);
          toast({
            title: "Rejected",
            description: "Confession has been rejected",
          });
          break;
        case 'flag':
          updatedConfession = await confessionsApi.flagConfession(confession.id);
          toast({
            title: "Flagged",
            description: "Confession has been flagged for review",
          });
          break;
        case 'hot':
          updatedConfession = await confessionsApi.markAsHot(confession.id, !confession.is_hot);
          toast({
            title: confession.is_hot ? "Unmarked" : "Marked Hot",
            description: `Confession ${confession.is_hot ? 'removed from' : 'added to'} hot confessions`,
          });
          break;
        default:
          return;
      }

      setConfession(updatedConfession);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to moderate confession",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!confession) return;

    try {
      await confessionsApi.deleteConfession(confession.id);
      toast({
        title: "Deleted",
        description: "Confession has been permanently deleted",
      });
      navigate(confessionsPath);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete confession",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <AdminLayout variant={layoutVariant}>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-64" />
          </div>
          <Card className="admin-card">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  if (!confession) {
    return (
      <AdminLayout variant={layoutVariant}>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Confession Not Found</h1>
            <p className="text-muted-foreground">The confession you're looking for doesn't exist.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout variant={layoutVariant}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(confessionsPath)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-display text-foreground">Confession #{confession.id}</h1>
              <p className="text-muted-foreground">Review and moderate confession</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {confession.is_hot && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                Hot
              </Badge>
            )}
            <StatusBadge status={confession.status} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Confession Content */}
            <Card className="admin-card">
              <CardHeader>
                <CardTitle>Confession Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="text-foreground whitespace-pre-wrap">{confession.content}</p>
                </div>
              </CardContent>
            </Card>

            {/* Confession Comments */}
            <Card className="admin-card">
              <CardHeader>
                <CardTitle>Comments</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingComments ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No comments yet.</div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((c: any) => (
                      <div key={c.id} className="rounded-lg border bg-card p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-foreground">
                                {c.is_anonymous ? 'Anonymous' : (c.author_full_name || c.author_username || 'User')}
                              </span>
                              <StatusBadge status={c.status} />
                              <span className="text-xs text-muted-foreground">
                                {c.created_at ? new Date(c.created_at).toLocaleString() : ''}
                              </span>
                            </div>
                            <Separator className="my-2" />
                            <p className="text-sm text-foreground whitespace-pre-wrap">{c.content}</p>
                          </div>

                          {isSuperAdmin && (
                            <div className="flex flex-col gap-2">
                              {c.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleModerateComment(Number(c.id), 'approve')}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleModerateComment(Number(c.id), 'reject')}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteComment(Number(c.id))}
                              >
                                Delete
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Moderation Actions */}
            {confession.status === 'pending' && (
              <Card className="admin-card">
                <CardHeader>
                  <CardTitle>Moderation Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => handleModerate('approve')}
                      className="w-full sm:flex-1 bg-green-600 hover:bg-green-700 h-auto whitespace-normal break-words leading-normal"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleModerate('reject')}
                      variant="destructive"
                      className="w-full sm:flex-1 h-auto whitespace-normal break-words leading-normal"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>

                  {moderationReason === 'reject' && (
                    <div className="space-y-2">
                      <Label htmlFor="moderation_reason">Reason for rejection *</Label>
                      <Textarea
                        id="moderation_reason"
                        value={moderationReason}
                        onChange={(e) => setModerationReason(e.target.value)}
                        placeholder="Provide a reason for rejecting this confession..."
                        rows={3}
                      />
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => handleModerate('flag')}
                      variant="outline"
                      className="w-full sm:flex-1 h-auto whitespace-normal break-words leading-normal"
                    >
                      <Flag className="mr-2 h-4 w-4" />
                      Flag for Review
                    </Button>
                    <Button
                      onClick={handleDelete}
                      variant="outline"
                      className="w-full sm:flex-1 h-auto whitespace-normal break-words leading-normal text-destructive hover:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {confession.status === 'approved' && (
              <Card className="admin-card">
                <CardHeader>
                  <CardTitle>Additional Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                    <Button
                      onClick={() => handleModerate('hot')}
                      variant={confession.is_hot ? "default" : "outline"}
                      className={`w-full sm:w-auto h-auto whitespace-normal break-words leading-normal text-left sm:text-center ${
                        confession.is_hot ? "bg-orange-600 hover:bg-orange-700" : ""
                      }`}
                    >
                      <Star className="mr-2 h-4 w-4" />
                      {confession.is_hot ? 'Remove from Hot' : 'Mark as Hot'}
                    </Button>
                    <Button
                      onClick={() => handleModerate('flag')}
                      variant="outline"
                      className="w-full sm:w-auto h-auto whitespace-normal break-words leading-normal text-left sm:text-center"
                    >
                      <Flag className="mr-2 h-4 w-4" />
                      Flag
                    </Button>
                    <Button
                      onClick={handleDelete}
                      variant="outline"
                      className="w-full sm:w-auto h-auto whitespace-normal break-words leading-normal text-left sm:text-center text-destructive hover:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Moderation History */}
            {(confession.moderated_by || confession.moderation_reason) && (
              <Card className="admin-card">
                <CardHeader>
                  <CardTitle>Moderation History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {confession.moderated_by_username && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Moderated by:</span>
                      <span className="font-medium">{confession.moderated_by_username}</span>
                    </div>
                  )}
                  {confession.moderated_at && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Moderated on:</span>
                      <span className="font-medium">
                        {new Date(confession.moderated_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {confession.moderation_reason && (
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">Reason:</span>
                      <p className="text-sm bg-muted p-2 rounded">{confession.moderation_reason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {/* Author Information */}
            <Card className="admin-card">
              <CardHeader>
                <CardTitle>Author Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  {confession.is_anonymous ? (
                    <>
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Anonymous</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{confession.author_username || "Unknown User"}</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {new Date(confession.created_at).toLocaleString()}
                  </span>
                </div>

                {confession.ip_address && (
                  <div className="text-xs text-muted-foreground">
                    IP: {confession.ip_address}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Engagement Statistics */}
            <Card className="admin-card">
              <CardHeader>
                <CardTitle>Engagement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    <span className="text-sm">Likes</span>
                  </div>
                  <span className="font-medium">{confession.likes_count}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Comments</span>
                  </div>
                  <span className="font-medium">{confession.comments_count}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Share className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Shares</span>
                  </div>
                  <span className="font-medium">{confession.shares_count}</span>
                </div>
              </CardContent>
            </Card>

            {/* Category */}
            {confession.category_name && (
              <Card className="admin-card">
                <CardHeader>
                  <CardTitle>Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline">{confession.category_name}</Badge>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

