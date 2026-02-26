import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { profileApi, type UserProfile, type UpdateProfileData } from "@/api/profile.api";
import { apiClient } from "@/api/base";
import { uploadsApi } from "@/api/uploads.api";

export default function AdminProfile() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [formData, setFormData] = useState<UpdateProfileData>({
    full_name: "",
    bio: "",
    avatar_url: "",
    phone: "",
    course: "",
    year_of_study: undefined,
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const token = apiClient.getToken();
    if (!token) {
      navigate('/admin/login', { replace: true });
      return;
    }

    try {
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
      if (typeof error?.message === 'string' && (
        error.message.includes('Access token is required') ||
        error.message.includes('Invalid token') ||
        error.message.includes('Token has expired')
      )) {
        apiClient.setToken(null);
        navigate('/admin/login', { replace: true });
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    try {
      setSaving(true);

      // Filter out empty strings and undefined values for optional fields
      const cleanFormData: any = {};

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
        cleanFormData.phone = formData.phone.trim();
      }

      if (formData.course && formData.course.trim() !== "") {
        cleanFormData.course = formData.course.trim();
      }

      if (formData.year_of_study && formData.year_of_study !== undefined) {
        cleanFormData.year_of_study = formData.year_of_study;
      }

      const updatedProfile = await profileApi.updateProfile(cleanFormData);

      setProfile(updatedProfile);
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

  const handleAvatarChange = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      const uploaded = await uploadsApi.uploadMedia(file);

      if (uploaded.media_type !== 'image') {
        toast({
          title: "Invalid file",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }

      setFormData((prev) => ({
        ...prev,
        avatar_url: uploaded.url,
      }));

      toast({
        title: "Upload complete",
        description: "Profile image uploaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload profile image.",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  };

  if (loading) {
    return (
      <AdminLayout variant="admin">
        <div className="space-y-6 max-w-2xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading profile...</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!profile) {
    return (
      <AdminLayout variant="admin">
        <div className="space-y-6 max-w-2xl">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Failed to load profile. Please try again.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout variant="admin">
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">My Profile</h1>
          <p className="text-muted-foreground">Manage your profile information</p>
        </div>

        {/* Avatar Section */}
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="font-display">Profile Picture</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={formData.avatar_url || profile.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {profile.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />
                <Button
                  size="icon"
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full gradient-primary text-primary-foreground"
                  onClick={handleAvatarChange}
                >
                  {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </Button>
              </div>
              <div>
                <p className="font-medium text-foreground">{profile.username}</p>
                <p className="text-sm text-muted-foreground capitalize">{profile.role.replace('_', ' ')}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={handleAvatarChange} disabled={uploadingAvatar}>
                  {uploadingAvatar ? "Uploading..." : "Change Photo"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="font-display">Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={profile.username}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Username cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed here</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name || ""}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Enter your full name"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="course">Course</Label>
                <Input
                  id="course"
                  value={formData.course || ""}
                  onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                  placeholder="e.g., Computer Science"
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
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+254 XXX XXX XXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio || ""}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={4}
                placeholder="Tell us about yourself..."
              />
              <p className="text-xs text-muted-foreground">
                Brief description for your profile. This will be shown on your author page.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="font-display">Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Status:</span>
                <span className={`font-medium ${profile.is_active ? 'text-green-600' : 'text-red-600'}`}>
                  {profile.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email Verified:</span>
                <span className={`font-medium ${profile.email_verified ? 'text-green-600' : 'text-orange-600'}`}>
                  {profile.email_verified ? 'Verified' : 'Unverified'}
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

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gradient-primary text-primary-foreground"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
