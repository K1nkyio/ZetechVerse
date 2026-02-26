import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { profileApi, UserProfile } from '@/api/profile.api';
import { postsApi, Post as ApiPost } from '@/api/posts.api';
import { UpdateProfileData } from '@/api/auth.api';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Edit, 
  Save, 
  Eye, 
  Heart, 
  MessageCircle, 
  Calendar,
  Loader2,
  ArrowLeft,
  Pencil
} from 'lucide-react';

interface UserPost {
  id: string;
  title: string;
  category: string;
  status: 'draft' | 'pending' | 'published' | 'rejected';
  views: number;
  likes: number;
  comments: number;
  date: string;
  excerpt: string;
  image?: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [formData, setFormData] = useState<UpdateProfileData>({
    full_name: "",
    bio: "",
    avatar_url: "",
    phone: "",
    course: "",
    year_of_study: undefined,
  });

  useEffect(() => {
    fetchProfile();
    fetchUserPosts();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const profileData = await profileApi.getProfile();
      setProfile(profileData);
      
      // Initialize form data with current profile values
      setFormData({
        full_name: profileData.full_name || "",
        bio: profileData.bio || "",
        avatar_url: profileData.avatar_url || "",
        phone: profileData.phone || "",
        course: profileData.course || "",
        year_of_study: profileData.year_of_study,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    try {
      setPostsLoading(true);
      const response = await postsApi.getMyPosts({
        limit: 100
      });

      const formattedPosts: UserPost[] = response.posts.map((post: ApiPost) => ({
        id: post.id.toString(),
        title: post.title,
        category: post.category_name || 'Uncategorized',
        status: post.status,
        views: post.views_count,
        likes: post.likes_count,
        comments: post.comments_count,
        date: new Date(post.created_at).toLocaleDateString(),
        excerpt: post.excerpt || post.content.substring(0, 150) + '...',
        image: post.image_url
      }));

      setPosts(formattedPosts);
    } catch (err: any) {
      console.error('Failed to fetch user posts:', err);
      toast({
        title: 'Error',
        description: 'Failed to load your posts',
        variant: 'destructive',
      });
    } finally {
      setPostsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    try {
      setSaving(true);
      
      // Filter out empty strings and undefined values for optional fields
      const cleanFormData: UpdateProfileData = {};

      if (formData.full_name && formData.full_name.trim() !== "") {
        cleanFormData.full_name = formData.full_name.trim();
      }

      if (formData.bio && formData.bio.trim() !== "") {
        cleanFormData.bio = formData.bio.trim();
      }

      if (formData.avatar_url && formData.avatar_url.trim() !== "") {
        cleanFormData.avatar_url = formData.avatar_url.trim();
      }

      if (formData.phone && formData.phone.trim() !== "") {
        cleanFormData.phone = formData.phone.replace(/[\s-]/g, "").trim();
      }

      if (formData.course && formData.course.trim() !== "") {
        cleanFormData.course = formData.course.trim();
      }

      if (formData.year_of_study && formData.year_of_study !== undefined) {
        cleanFormData.year_of_study = formData.year_of_study;
      }

      const updatedProfile = await profileApi.updateProfile(cleanFormData);
      
      setProfile(updatedProfile);
      setEditing(false);
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      console.error('Profile update error:', error);
      
      // Show more specific error messages
      let errorMessage = "Failed to update profile";
      if (error.errors && Array.isArray(error.errors)) {
        errorMessage = error.errors.map((err: any) => err.message || err.msg).join(', ');
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading profile...</span>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <p className="text-destructive">Failed to load profile. Please try again.</p>
            <Button onClick={fetchProfile} variant="outline" className="mt-4">Try Again</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isAccountActive = profile.is_active !== false;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          className="mb-6" 
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="max-w-6xl mx-auto">
          {/* Profile Header */}
          <div className="bg-card rounded-2xl border border-border p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  {profile.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={profile.full_name || profile.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-12 w-12 text-primary" />
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {profile.full_name || profile.username}
                  </h1>
                  <p className="text-muted-foreground capitalize">{profile.role.replace('_', ' ')}</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                {editing ? (
                  <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                ) : (
                  <Button onClick={() => setEditing(true)} className="gap-2">
                    <Edit className="h-4 w-4" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Details */}
            <div className="lg:col-span-2 space-y-8">
              {/* Profile Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name || ""}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder="Enter your full name"
                        disabled={!editing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="course">Course</Label>
                      <Input
                        id="course"
                        value={formData.course || ""}
                        onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                        placeholder="e.g., Computer Science"
                        disabled={!editing}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone || ""}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+254 XXX XXX XXX"
                        disabled={!editing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year_of_study">Year of Study</Label>
                      <Input
                        id="year_of_study"
                        type="number"
                        min="1"
                        max="6"
                        value={formData.year_of_study || ""}
                        onChange={(e) => setFormData({ ...formData, year_of_study: parseInt(e.target.value) || undefined })}
                        placeholder="1-6"
                        disabled={!editing}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio || ""}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={4}
                      placeholder="Tell us about yourself..."
                      disabled={!editing}
                    />
                    <p className="text-xs text-muted-foreground">
                      Brief description for your profile. This will be shown on your author page.
                    </p>
                  </div>
                </CardContent>
              </Card>


            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Account Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Username:</span>
                      <span className="font-medium">{profile.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{profile.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Status:</span>
                      <span className={`font-medium ${isAccountActive ? 'text-green-600' : 'text-red-600'}`}>
                        {isAccountActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email Verified:</span>
                      <span className="font-medium text-green-600">
                        Verified
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Member Since:</span>
                      <span className="font-medium">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Login:</span>
                      <span className="font-medium">
                        {profile.last_login_at ? new Date(profile.last_login_at).toLocaleDateString() : 'Never'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>


            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Profile;
