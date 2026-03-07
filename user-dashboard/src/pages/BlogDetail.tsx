import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SocialShare from '@/components/SocialShare';
import ReadingProgress from '@/components/ReadingProgress';
import TableOfContents from '@/components/TableOfContents';
import RelatedPosts from '@/components/RelatedPosts';
import BackToTop from '@/components/BackToTop';
import MediaGallery, { type MediaGalleryItem } from '@/components/MediaGallery';
import { postsApi, Post as ApiPost } from '@/api/posts.api';
import { Comment } from '@/api/comments.api';
import { useToast } from '@/hooks/use-toast';
import { Clock, User, Calendar, Heart, MessageCircle, Share, ThumbsUp, Reply } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { apiClient } from '@/api/base';

interface RelatedPost {
  slug: string;
  title: string;
  category: string;
  date: string;
  readTime: string;
  image: string;
  excerpt?: string;
}

interface CommentWithLike extends Comment {
  userLiked?: boolean;
}

const hasHtmlTags = (value: string) => /<\/?[a-z][\s\S]*>/i.test(value);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatArticleContent = (rawContent: string) => {
  const content = String(rawContent || '').trim();
  if (!content) return '';
  if (hasHtmlTags(content)) return content;

  const paragraphs = content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');
};

const isLikelyVideo = (url: string) => /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url);

const BlogDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [post, setPost] = useState<ApiPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<CommentWithLike[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const articleContent = useMemo(() => formatArticleContent(post?.content || ''), [post?.content]);
  const mediaItems = useMemo<MediaGalleryItem[]>(() => {
    if (!post) return [];

    const list: MediaGalleryItem[] = [];
    const seen = new Set<string>();

    const addItem = (type: 'image' | 'video', src?: string | null, options?: { alt?: string; poster?: string }) => {
      const value = src?.trim();
      if (!value) return;

      const key = `${type}:${value}`;
      if (seen.has(key)) return;

      seen.add(key);
      list.push({
        type,
        src: value,
        alt: options?.alt,
        poster: options?.poster,
      });
    };

    addItem('image', post.image_url, { alt: post.title });
    addItem('video', post.video_url, { alt: `${post.title} video`, poster: post.image_url });

    post.image_urls?.forEach((url) => addItem('image', url, { alt: post.title }));
    post.video_urls?.forEach((url) => addItem('video', url, { alt: `${post.title} video`, poster: post.image_url }));

    post.media_urls?.forEach((url) =>
      addItem(isLikelyVideo(url) ? 'video' : 'image', url, {
        alt: post.title,
        poster: post.image_url,
      })
    );

    return list;
  }, [post]);

  const requireAuth = (actionText: string) => {
    const token = apiClient.getToken();
    if (!token) {
      toast({
        title: 'Login Required',
        description: `Please log in to ${actionText}.`,
        variant: 'destructive',
      });
      navigate('/login', { state: { from: location } });
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (id) {
      fetchPost();
      fetchRelatedPosts();
      fetchComments();
    }
  }, [id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      setError(null);
      const postData = await postsApi.getPostById(id!);
      setPost(postData);
      setIsLiked(!!postData.likedByMe);
    } catch (err: any) {
      console.error('Failed to fetch post:', err);
      setError('Failed to load post');
      toast({
        title: 'Error',
        description: 'Could not load the post. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    if (!id) return;
    
    try {
      setLoadingComments(true);
      // Load comments from localStorage if available
      const savedComments = localStorage.getItem(`blog_comments_${id}`);
      if (savedComments) {
        setComments(JSON.parse(savedComments));
      } else {
        // Return empty array initially
        setComments([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch comments:', err);
      toast({
        title: 'Error',
        description: 'Could not load comments. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingComments(false);
    }
  };

  const fetchRelatedPosts = async () => {
    try {
      const response = await postsApi.getPosts({ status: 'published', limit: 10 });
      const formattedPosts: RelatedPost[] = response.posts
        .filter(p => p.id.toString() !== id) // Exclude current post
        .map((p: ApiPost) => ({
          slug: p.id.toString(),
          title: p.title,
          category: p.category_name || 'Uncategorized',
          date: new Date(p.created_at).toLocaleDateString(),
          readTime: `${Math.ceil(p.content.length / 1000)} min read`,
          image: p.image_url || '/placeholder.svg',
          excerpt: p.excerpt || p.content.substring(0, 100) + '...'
        }));
      setRelatedPosts(formattedPosts);
    } catch (err: any) {
      console.error('Failed to fetch related posts:', err);
      // Continue without related posts
    }
  };

  const handleLike = async () => {
    if (!post) return;

    if (!requireAuth('like this post')) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast({
        title: 'Offline',
        description: 'You appear to be offline. Please reconnect and try again.',
        variant: 'destructive',
      });
      return;
    }

    if (likeBusy) return;
    const optimisticLiked = !isLiked;
    const previousLikes = post.likes_count;
    setLikeBusy(true);
    setIsLiked(optimisticLiked);
    setPost((prev) => prev ? { ...prev, likes_count: optimisticLiked ? previousLikes + 1 : Math.max(0, previousLikes - 1) } : prev);

    try {
      const response = await postsApi.toggleLike(post.id);
      setIsLiked(response.liked);
      setPost((prev) => prev ? { ...prev, likes_count: response.likes_count } : prev);
      toast({
        title: response.liked ? 'Liked!' : 'Unliked!',
        description: response.liked ? 'Added your like to this post' : 'Removed your like from this post',
      });
    } catch (err: any) {
      console.error('Failed to like post:', err);
      setIsLiked(!optimisticLiked);
      setPost((prev) => prev ? { ...prev, likes_count: previousLikes } : prev);
      toast({
        title: 'Error',
        description: err.message || 'Could not update like status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLikeBusy(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!requireAuth('comment')) return;
    
    if (!commentText.trim()) {
      toast({
        title: 'Error',
        description: 'Comment cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (!id) return;
      
      // Create a new comment object
      const newComment: CommentWithLike = {
        id: Date.now().toString(),
        content: commentText,
        post_id: id,
        user_id: '1', // Temporary user ID
        author_name: 'Anonymous User',
        likes_count: 0,
        replies_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_edited: false,
        status: 'approved'
      };
      
      // Add new comment to the top
      const updatedComments = [newComment, ...comments];
      setComments(updatedComments);
      
      // Save comments to localStorage
      localStorage.setItem(`blog_comments_${id}`, JSON.stringify(updatedComments));
      
      setCommentText(''); // Clear the input
      
      toast({
        title: 'Success',
        description: 'Comment added successfully',
      });
    } catch (err: any) {
      console.error('Failed to submit comment:', err);
      toast({
        title: 'Error',
        description: 'Could not submit your comment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCommentLike = (commentId: string) => {
    if (!requireAuth('like comments')) return;

    setComments(prevComments => 
      prevComments.map(comment => 
        comment.id === commentId 
          ? { 
              ...comment, 
              likes_count: comment.userLiked ? comment.likes_count - 1 : comment.likes_count + 1,
              userLiked: !comment.userLiked
            } 
          : comment
      )
    );
    
    // Save updated comments to localStorage
    if (id) {
      localStorage.setItem(`blog_comments_${id}`, JSON.stringify(comments));
    }
    
    toast({
      title: 'Success',
      description: 'Comment liked successfully!',
    });
  };

  const handleReply = (commentId: string) => {
    setReplyingTo(commentId);
    setReplyText('');
  };

  const handleReplySubmit = (e: React.FormEvent, parentCommentId: string) => {
    e.preventDefault();

    if (!requireAuth('reply')) return;
    
    if (!replyText.trim()) {
      toast({
        title: 'Error',
        description: 'Reply cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (!id) return;
      
      // Create a new reply object
      const newReply: CommentWithLike = {
        id: `reply_${Date.now()}`,
        content: replyText,
        post_id: id,
        user_id: '1', // Temporary user ID
        author_name: 'Anonymous User',
        likes_count: 0,
        replies_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_edited: false,
        status: 'approved',
        parent_id: parentCommentId
      };
      
      // Add reply to the parent comment
      const updatedComments = comments.map(comment => {
        if (comment.id === parentCommentId) {
          return {
            ...comment,
            replies_count: comment.replies_count + 1
          };
        }
        return comment;
      });
      
      // Add the reply to the comments array
      const finalComments = [...updatedComments, newReply];
      setComments(finalComments);
      
      // Save comments to localStorage
      localStorage.setItem(`blog_comments_${id}`, JSON.stringify(finalComments));
      
      setReplyText('');
      setReplyingTo(null); // Clear reply state
      
      toast({
        title: 'Success',
        description: 'Reply added successfully',
      });
    } catch (err: any) {
      console.error('Failed to submit reply:', err);
      toast({
        title: 'Error',
        description: 'Could not submit your reply. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-3 sm:px-4 py-8">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading post...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-3 sm:px-4 py-8">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold text-foreground mb-4">Post Not Found</h1>
            <p className="text-muted-foreground mb-6">{error || 'The post you are looking for does not exist.'}</p>
            <Link to="/explore">
              <Button variant="outline">Back to Explore</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Calculate read time
  const readTime = Math.ceil(post.content.length / 1000);
  
  // Format date
  const formattedDate = new Date(post.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-background">
      <ReadingProgress />
      <Header />
      
      <main id="main-content" className="container mx-auto px-3 sm:px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <article>
              {/* Article Header */}
              <header className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="secondary" className="capitalize">
                    {post.category_name || 'Uncategorized'}
                  </Badge>
                  <span className="text-muted-foreground text-xs">—</span>
                  <time className="text-xs text-muted-foreground" dateTime={post.created_at}>
                    {formattedDate}
                  </time>
                </div>
                
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 leading-tight">
                  {post.title}
                </h1>
                
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {post.author_name || post.author_username || 'Anonymous'}
                      </p>
                      <p className="text-xs text-muted-foreground">{readTime} min read</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <SocialShare 
                      title={post.title}
                      description={`Read "${post.title}" on ZetechVerse`}
                    />
                    
                    <Button 
                      variant={isLiked ? "secondary" : "outline"} 
                      size="sm"
                      onClick={handleLike}
                      disabled={likeBusy}
                      aria-label={isLiked ? "Unlike post" : "Like post"}
                    >
                      <ThumbsUp className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current text-red-500' : ''}`} />
                      {post.likes_count}
                    </Button>
                  </div>
                </div>
              </header>

              {mediaItems.length > 0 && <MediaGallery items={mediaItems} className="mb-8" />}

              {/* Article Content */}
              <div 
                className="prose prose-lg max-w-none text-foreground article-content
                  prose-headings:text-foreground prose-headings:font-bold prose-headings:mb-4 prose-headings:mt-8
                  prose-p:text-muted-foreground prose-p:leading-8 prose-p:mb-6
                  prose-ul:text-muted-foreground prose-li:text-muted-foreground
                  prose-blockquote:text-muted-foreground prose-blockquote:border-l-primary prose-blockquote:pl-4
                  prose-img:rounded-lg prose-img:my-6"
                data-article-content
                dangerouslySetInnerHTML={{ __html: articleContent }}
              />
            </article>

            {/* Comments Section */}
            <section className="mt-12 pt-8 border-t border-border">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Comments ({comments.length})
              </h2>
              
              {/* Comment Form */}
              <form onSubmit={handleCommentSubmit} className="mb-8">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write your comment..."
                      className="w-full p-3 border border-input rounded-md focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                      rows={3}
                    />
                  </div>
                  <Button type="submit" disabled={loadingComments}>
                    Comment
                  </Button>
                </div>
              </form>
              
              {/* Comments List */}
              {loadingComments ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : comments.length > 0 ? (
                <div className="space-y-6">
                  {comments.filter(comment => !comment.parent_id).map((comment) => (
                    <div key={comment.id} className="border-b border-border pb-6 last:border-0">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-foreground">{comment.author_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-foreground">{comment.content}</p>
                          
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <button 
                              className={`flex items-center gap-1 hover:text-foreground ${comment.userLiked ? 'text-red-500' : ''}`}
                              onClick={() => handleCommentLike(comment.id)}
                            >
                              <Heart className={`h-4 w-4 ${comment.userLiked ? 'fill-current' : ''}`} />
                              {comment.likes_count}
                            </button>
                            <button 
                              className="flex items-center gap-1 hover:text-foreground"
                              onClick={() => handleReply(comment.id)}
                            >
                              <Reply className="h-4 w-4" />
                              Reply
                            </button>
                          </div>
                          
                          {/* Reply form */}
                          {replyingTo === comment.id && (
                            <form onSubmit={(e) => handleReplySubmit(e, comment.id)} className="mt-4 ml-4">
                              <div className="flex gap-2">
                                <Input
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder="Write your reply..."
                                  className="flex-1"
                                />
                                <Button type="submit" size="sm">
                                  Reply
                                </Button>
                                <Button 
                                  type="button" 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setReplyingTo(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          )}
                          
                          {/* Replies */}
                          {comments
                            .filter(reply => reply.parent_id === comment.id)
                            .map(reply => (
                              <div key={reply.id} className="mt-4 ml-8 pl-4 border-l-2 border-border">
                                <div className="flex gap-2">
                                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-foreground text-sm">{reply.author_name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(reply.created_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <p className="text-foreground text-sm">{reply.content}</p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                      <button 
                                        className={`flex items-center gap-1 hover:text-foreground ${reply.userLiked ? 'text-red-500' : ''}`}
                                        onClick={() => handleCommentLike(reply.id)}
                                      >
                                        <Heart className={`h-3 w-3 ${reply.userLiked ? 'fill-current' : ''}`} />
                                        {reply.likes_count}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic">No comments yet. Be the first to comment!</p>
              )}
            </section>

            {/* Related Posts */}
            <section className="mt-16 pt-8 border-t border-border">
              <RelatedPosts
                currentPost={{ category: post.category_name || 'all', title: post.title }} 
                allPosts={relatedPosts}
                maxPosts={3}
              />
            </section>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-8">
            {/* Table of Contents */}
            <TableOfContents content={post.content} />

            {/* Newsletter Signup */}
            <div className="bg-black text-white p-6">
              <h3 className="text-lg font-bold mb-4">Newsletter</h3>
              <p className="text-sm mb-4 opacity-90">
                Subscribe to our newsletter to get our newest articles instantly!
              </p>
              <div className="space-y-3">
                <Input
                  type="email"
                  placeholder="Your email"
                  className="bg-white text-black border-0"
                />
                <Button variant="outline" className="w-full bg-white text-black hover:bg-gray-100">
                  SIGNUP
                </Button>
              </div>
            </div>

            {/* Post Stats */}
            <div className="bg-card p-6 border border-border rounded-lg">
              <h3 className="text-lg font-bold text-foreground mb-4">Post Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Views</span>
                  <span className="font-medium">{post.views_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Likes</span>
                  <span className="font-medium">{post.likes_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Comments</span>
                  <span className="font-medium">{post.comments_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Published</span>
                  <span className="font-medium">{formattedDate}</span>
                </div>
              </div>
            </div>

            {/* Categories */}
            <div>
              <h3 className="text-lg font-bold text-foreground mb-4">Categories</h3>
              <div className="space-y-2">
                {['Technology', 'Finance', 'Career', 'Campus', 'Wellness', 'Success'].map((category) => (
                  <Link
                    key={category}
                    to={`/search?q=${encodeURIComponent(category)}`}
                    className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {category}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
};

export default BlogDetail;
