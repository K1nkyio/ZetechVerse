import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Save, Loader2, Shield, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { profileApi, type UserProfile, type UpdateProfileData } from "@/api/profile.api";
import { apiClient } from "@/api/base";
import { uploadsApi } from "@/api/uploads.api";

export default function SuperAdminProfile() {
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

  const publishProfileUpdate = (updated: UserProfile) => {
    window.dispatchEvent(new CustomEvent<UserProfile>("admin-profile-updated", { detail: updated }));
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const token = apiClient.getToken();
    if (!token) {
      navigate('/super-admin/login', { replace: true });
      return;
    }

    try {
      const profileData = await profileApi.getProfile();
      setProfile(profileData);
      publishProfileUpdate(profileData);

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
        navigate('/super-admin/login', { replace: true });
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
      publishProfileUpdate(updatedProfile);
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
      <AdminLayout variant="super-admin">
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
      <AdminLayout variant="super-admin">
        <div className="space-y-6 max-w-2xl">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Failed to load profile. Please try again.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout variant="super-admin">
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <Crown className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">Super Admin Profile</h1>
            <p className="text-muted-foreground">Manage your super administrator profile</p>
          </div>
        </div>

        {/* Avatar Section */}
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Profile Picture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-28 w-28 border-4 border-purple-200">
                  <AvatarImage src={formData.avatar_url || profile.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-3xl">
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
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <Crown className="h-4 w-4 text-white" />
                </div>
                <Button
                  size="icon"
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
                  onClick={handleAvatarChange}
                >
                  {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground text-xl">{profile.username}</p>
                <p className="text-sm text-purple-600 font-medium flex items-center gap-1">
                  <Crown className="h-4 w-4" />
                  System Administrator
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAvatarChange}
                    disabled={uploadingAvatar}
                    className="border-purple-200 hover:bg-purple-50"
                  >
                    {uploadingAvatar ? "Uploading..." : "Change Photo"}
                  </Button>
                  <div className="px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 rounded-md">
                    <span className="text-xs font-medium text-purple-700">Highest Privilege Level</span>
                  </div>
                </div>
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
                  className="bg-muted border-purple-200"
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
                  className="bg-muted border-purple-200"
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
                className="border-purple-200 focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="course">Course/Department</Label>
                <Input
                  id="course"
                  value={formData.course || ""}
                  onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                  placeholder="e.g., IT Administration"
                  className="border-purple-200 focus:border-purple-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+254 XXX XXX XXX"
                  className="border-purple-200 focus:border-purple-500"
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
                placeholder="Tell us about your role and responsibilities..."
                className="border-purple-200 focus:border-purple-500"
              />
              <p className="text-xs text-muted-foreground">
                Brief description of your role and responsibilities as a system administrator.
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
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <span className="text-purple-700 font-medium">Security Level:</span>
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-purple-600" />
                  <span className="font-bold text-purple-700">MAXIMUM</span>
                </div>
              </div>
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
                <span className="text-muted-foreground">Administrator Since:</span>
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
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium px-8 py-3"
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
