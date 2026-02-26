import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Edit, Clock, ArrowRight, FileText, Loader2, Save, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { postsApi, Post } from "@/api/posts.api";

interface PendingPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: {
    name: string;
    avatar: string;
    role: string;
  };
  category: string;
  submittedAt: string;
  tags: string[];
}

export default function SuperAdminReview() {
  const { toast } = useToast();
  const [pendingPosts, setPendingPosts] = useState<PendingPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<PendingPost | null>(null);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    excerpt: "",
    content: "",
    category: ""
  });
  const [editLoading, setEditLoading] = useState(false);

  // Available categories for dropdown
  const availableCategories = [
    "Technology",
    "Design", 
    "Development",
    "AI & ML",
    "Startup",
    "Careers",
    "Tutorial",
    "News",
    "Finance",
    "Health",
    "Education",
    "Entertainment",
    "Sports",
    "Travel",
    "Food",
    "Relationship",
    "Spirituality",
    "Gardening",
    "Cooking",
    "Beauty",
    "Personal Development",
    "Mindfulness"
  ];

  useEffect(() => {
    fetchPendingPosts();
  }, []);

  const fetchPendingPosts = async () => {
    try {
      setLoading(true);
      const response = await postsApi.getReviewQueue({ limit: 50 });
      const formattedPosts: PendingPost[] = response.posts.map((post: Post) => ({
        id: post.id.toString(),
        title: post.title,
        excerpt: post.excerpt || post.content.substring(0, 150) + '...',
        content: post.content,
        author: {
          name: post.author_name || post.author_username || 'Anonymous',
          avatar: post.author_avatar || '',
          role: 'Editor'
        },
        category: post.category_name || 'Uncategorized',
        submittedAt: new Date(post.created_at).toLocaleDateString(),
        tags: post.tags
      }));

      setPendingPosts(formattedPosts);
      if (formattedPosts.length > 0 && !selectedPost) {
        setSelectedPost(formattedPosts[0]);
      }
    } catch (error) {
      console.error('Error fetching pending posts:', error);
      toast({
        title: "Error",
        description: "Failed to load pending posts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedPost) return;

    try {
      setActionLoading(true);
      await postsApi.reviewPost(selectedPost.id, 'approve');

      toast({
        title: "Post Approved",
        description: `"${selectedPost.title}" has been published successfully.`,
      });

      // Remove from pending list and select next post
      const updatedPosts = pendingPosts.filter(p => p.id !== selectedPost.id);
      setPendingPosts(updatedPosts);
      setSelectedPost(updatedPosts[0] || null);
    } catch (error) {
      console.error('Error approving post:', error);
      toast({
        title: "Error",
        description: "Failed to approve post",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPost || !feedback.trim()) return;

    try {
      setActionLoading(true);
      await postsApi.reviewPost(selectedPost.id, 'reject');

      toast({
        title: "Post Rejected",
        description: `Post rejected and author notified.`,
      });

      // Remove from pending list and select next post
      const updatedPosts = pendingPosts.filter(p => p.id !== selectedPost.id);
      setPendingPosts(updatedPosts);
      setSelectedPost(updatedPosts[0] || null);
      setFeedback("");
    } catch (error) {
      console.error('Error rejecting post:', error);
      toast({
        title: "Error",
        description: "Failed to reject post",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditFirst = () => {
    if (!selectedPost) return;

    // Populate edit form with current post data
    setEditForm({
      title: selectedPost.title,
      excerpt: selectedPost.excerpt,
      content: selectedPost.content,
      category: selectedPost.category
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPost) return;

    try {
      setEditLoading(true);

      // Transform form data for backend
      const updatedData = {
        title: editForm.title,
        content: editForm.content,
        excerpt: editForm.excerpt,
        category: editForm.category,
        status: 'pending' // Keep as pending after edit
      };

      await postsApi.updatePost(selectedPost.id, updatedData);

      // Update the post in the pending list
      const updatedPosts = pendingPosts.map(p => 
        p.id === selectedPost.id 
          ? { ...p, ...editForm }
          : p
      );
      setPendingPosts(updatedPosts);

      // Update selected post
      setSelectedPost({ ...selectedPost, ...editForm });

      toast({
        title: "Post Updated",
        description: "Post has been updated successfully.",
      });

      setEditModalOpen(false);
    } catch (error) {
      console.error('Error updating post:', error);
      toast({
        title: "Error",
        description: "Failed to update post",
        variant: "destructive",
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditFormChange = (field: keyof typeof editForm, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <AdminLayout variant="super-admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Review Queue</h1>
          <p className="text-muted-foreground">Review and approve posts submitted by editors</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Queue List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold font-display">Pending Posts</h2>
              <Badge variant="secondary" className="bg-warning/10 text-warning">
                {pendingPosts.length} pending
              </Badge>
            </div>
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                  <span>Loading pending posts...</span>
                </div>
              ) : pendingPosts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No posts pending review</p>
                </div>
              ) : (
                pendingPosts.map((post) => (
                  <Card
                    key={post.id}
                    className={`admin-card cursor-pointer transition-all ${
                      selectedPost?.id === post.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedPost(post)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={post.author.avatar} />
                          <AvatarFallback>{post.author.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{post.title}</p>
                          <p className="text-sm text-muted-foreground">{post.author.name}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">{post.category}</Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {post.submittedAt}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Preview & Actions */}
          <div className="lg:col-span-2 space-y-6">
            {selectedPost ? (
              <>
                {/* Post Preview */}
                <Card className="admin-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-display">Post Preview</CardTitle>
                      <StatusBadge status="pending" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold font-display text-foreground mb-2">
                        {selectedPost.title}
                      </h2>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={selectedPost.author.avatar} />
                            <AvatarFallback>{selectedPost.author.name[0]}</AvatarFallback>
                          </Avatar>
                          <span>{selectedPost.author.name}</span>
                        </div>
                        <span>•</span>
                        <span>{selectedPost.author.role}</span>
                        <span>•</span>
                        <span>{selectedPost.submittedAt}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-primary/10 text-primary">{selectedPost.category}</Badge>
                      {selectedPost.tags.map((tag) => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>

                    <div className="border-t border-border pt-6">
                      <h3 className="font-semibold mb-2">Excerpt</h3>
                      <p className="text-muted-foreground">{selectedPost.excerpt}</p>
                    </div>

                    <div className="border-t border-border pt-6">
                      <h3 className="font-semibold mb-2">Content Preview</h3>
                      <div className="prose prose-sm max-w-none text-muted-foreground">
                        <p>{selectedPost.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card className="admin-card">
                  <CardHeader>
                    <CardTitle className="font-display">Review Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Feedback (required for rejection)</label>
                      <Textarea
                        placeholder="Enter feedback for the author..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                        onClick={handleApprove}
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="mr-2 h-4 w-4" />
                        )}
                        Approve & Publish
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={handleEditFirst}
                        disabled={actionLoading}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit First
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={handleReject}
                        disabled={!feedback.trim() || actionLoading}
                      >
                        {actionLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="mr-2 h-4 w-4" />
                        )}
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="admin-card h-96 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a post to review</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Post</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editForm.title}
                onChange={(e) => handleEditFormChange('title', e.target.value)}
                placeholder="Enter post title..."
                className="admin-input"
              />
            </div>

            {/* Excerpt */}
            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                value={editForm.excerpt}
                onChange={(e) => handleEditFormChange('excerpt', e.target.value)}
                placeholder="Enter post excerpt..."
                rows={3}
                className="admin-input"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={editForm.category}
                onValueChange={(value) => handleEditFormChange('category', value)}
              >
                <SelectTrigger className="admin-input">
                  <SelectValue placeholder="Select a category..." />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={editForm.content}
                onChange={(e) => handleEditFormChange('content', e.target.value)}
                placeholder="Enter post content..."
                rows={12}
                className="admin-input"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              disabled={editLoading}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={editLoading || !editForm.title.trim() || !editForm.content.trim()}
            >
              {editLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
