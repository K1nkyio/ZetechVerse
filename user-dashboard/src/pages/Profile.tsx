import { useState, useEffect, useMemo } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { profileApi, UserProfile } from '@/api/profile.api';
import { careerApi, type CareerProfile, type SavedOpportunity, type ApplicationTrackerItem, type CareerRecommendation } from '@/api/career.api';
import { UpdateProfileData } from '@/api/auth.api';
import { uploadsApi } from '@/api/uploads.api';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/contexts/auth-context';
import { getProfileCompletionSummary } from '@/lib/profile-completion';
import { 
  User, 
  Edit, 
  Save, 
  Loader2,
  ArrowLeft,
  Upload,
  FileText,
  Sparkles,
  Bookmark,
  BriefcaseBusiness,
  Camera
} from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshProfile } = useAuthContext();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [careerLoading, setCareerLoading] = useState(true);
  const [savingCareer, setSavingCareer] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [careerProfile, setCareerProfile] = useState<CareerProfile>({
    user_id: 0,
    skills: [],
    interests: [],
    mentor_open: false,
    mentorship_topics: [],
  });
  const [skillsInput, setSkillsInput] = useState('');
  const [interestsInput, setInterestsInput] = useState('');
  const [mentorshipTopicsInput, setMentorshipTopicsInput] = useState('');
  const [savedOpportunities, setSavedOpportunities] = useState<SavedOpportunity[]>([]);
  const [applications, setApplications] = useState<ApplicationTrackerItem[]>([]);
  const [recommendations, setRecommendations] = useState<CareerRecommendation[]>([]);
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
    fetchCareerCenter();
  }, []);

  const profileDraft = useMemo(() => {
    if (!profile) return null;
    return {
      ...profile,
      full_name: formData.full_name || profile.full_name,
      bio: formData.bio || profile.bio,
      avatar_url: formData.avatar_url || profile.avatar_url,
      phone: formData.phone || profile.phone,
      course: formData.course || profile.course,
      year_of_study: formData.year_of_study || profile.year_of_study,
    };
  }, [profile, formData]);

  const completionSummary = useMemo(
    () => getProfileCompletionSummary(profileDraft, careerProfile),
    [profileDraft, careerProfile]
  );

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

  const fetchCareerCenter = async () => {
    try {
      setCareerLoading(true);
      const [careerProfileData, savedData, applicationData, recommendationData] = await Promise.all([
        careerApi.getProfile(),
        careerApi.getSavedOpportunities(),
        careerApi.getApplications(),
        careerApi.getRecommendations(),
      ]);

      setCareerProfile(careerProfileData);
      setSkillsInput((careerProfileData.skills || []).join(', '));
      setInterestsInput((careerProfileData.interests || []).join(', '));
      setMentorshipTopicsInput((careerProfileData.mentorship_topics || []).join(', '));
      setSavedOpportunities(savedData);
      setApplications(applicationData);
      setRecommendations(recommendationData);
    } catch (error: any) {
      toast({
        title: 'Career center unavailable',
        description: error.message || 'Could not load your career center right now.',
        variant: 'destructive',
      });
    } finally {
      setCareerLoading(false);
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
      const refreshedProfile = await refreshProfile().catch(() => updatedProfile);

      setProfile(refreshedProfile);
      setFormData({
        full_name: refreshedProfile.full_name || "",
        bio: refreshedProfile.bio || "",
        avatar_url: refreshedProfile.avatar_url || "",
        phone: refreshedProfile.phone || "",
        course: refreshedProfile.course || "",
        year_of_study: refreshedProfile.year_of_study,
      });
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

  const splitCommaList = (value: string) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  const handleCareerSave = async () => {
    try {
      setSavingCareer(true);
      const updated = await careerApi.updateProfile({
        ...careerProfile,
        skills: splitCommaList(skillsInput),
        interests: splitCommaList(interestsInput),
        mentorship_topics: splitCommaList(mentorshipTopicsInput),
      });
      setCareerProfile(updated);
      toast({
        title: 'Career center updated',
        description: 'Your CV, skills, and mentoring settings have been saved.',
      });
      await fetchCareerCenter();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update your career center',
        variant: 'destructive',
      });
    } finally {
      setSavingCareer(false);
    }
  };

  const handleResumeUpload = async (file?: File | null) => {
    if (!file) return;

    try {
      setUploadingResume(true);
      const uploaded = await uploadsApi.uploadMedia(file);
      if (uploaded.media_type !== 'document') {
        throw new Error('Please upload a PDF or Word document.');
      }

      setCareerProfile((prev) => ({
        ...prev,
        resume_url: uploaded.url,
        resume_filename: uploaded.filename,
      }));

      toast({
        title: 'CV uploaded',
        description: 'Remember to save your career center to keep this CV attached.',
      });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Could not upload your CV',
        variant: 'destructive',
      });
    } finally {
      setUploadingResume(false);
    }
  };

  const handleAvatarUpload = async (file?: File | null) => {
    if (!file) return;

    try {
      setUploadingAvatar(true);
      const uploaded = await profileApi.uploadAvatar(file);
      const updatedProfile = await profileApi.updateProfile({
        avatar_url: uploaded.avatar_url,
      });
      const refreshedProfile = await refreshProfile().catch(() => updatedProfile);

      setProfile(refreshedProfile);
      setFormData((prev) => ({
        ...prev,
        avatar_url: refreshedProfile.avatar_url || uploaded.avatar_url,
      }));

      toast({
        title: 'Profile photo updated',
        description: 'Your new profile image is now active.',
      });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Could not upload your profile image',
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
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
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden">
                  {profileDraft?.avatar_url ? (
                    <img 
                      src={profileDraft.avatar_url} 
                      alt={profile.full_name || profile.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-12 w-12 text-primary" />
                  )}
                  </div>
                  <label
                    htmlFor="profile-avatar-upload"
                    className="absolute -bottom-2 -right-2 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-muted"
                    aria-label="Upload profile image"
                  >
                    {uploadingAvatar ? <Upload className="h-4 w-4 animate-pulse" /> : <Camera className="h-4 w-4" />}
                  </label>
                  <Input
                    id="profile-avatar-upload"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => void handleAvatarUpload(event.target.files?.[0] || null)}
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {profile.full_name || profile.username}
                  </h1>
                  <p className="text-muted-foreground capitalize">{profile.role.replace('_', ' ')}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Add a profile photo, finish your personal details, and complete your career setup to reach 100%.
                  </p>
                </div>
              </div>
              
              <div className="w-full md:w-72 space-y-3">
                <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">Setup progress</span>
                    <Badge variant={completionSummary.percentage === 100 ? 'default' : 'secondary'}>
                      {completionSummary.percentage}%
                    </Badge>
                  </div>
                  <Progress value={completionSummary.percentage} className="h-2.5" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {completionSummary.percentage === 100
                      ? 'Everything required for your profile is complete.'
                      : `${completionSummary.completed} of ${completionSummary.total} setup steps completed.`}
                  </p>
                </div>

                <div className="flex gap-3 justify-end">
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
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={profile.email || ""}
                        readOnly
                        disabled
                        className="bg-muted/45 text-muted-foreground"
                      />
                    </div>
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Career Center
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {careerLoading ? (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading your career toolkit...
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="resume-upload">CV / Resume</Label>
                        <Input
                          id="resume-upload"
                          type="file"
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={(event) => void handleResumeUpload(event.target.files?.[0] || null)}
                        />
                        <div className="text-xs text-muted-foreground">
                          {uploadingResume ? 'Uploading CV...' : careerProfile.resume_url ? `Current CV: ${careerProfile.resume_filename || 'Uploaded document'}` : 'Upload one reusable CV for faster applications.'}
                        </div>
                        {careerProfile.resume_url && (
                          <a href={careerProfile.resume_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                            <FileText className="h-4 w-4" />
                            Open uploaded CV
                          </a>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="skills">Skills</Label>
                          <Textarea
                            id="skills"
                            rows={3}
                            value={skillsInput}
                            onChange={(e) => setSkillsInput(e.target.value)}
                            placeholder="React, data analysis, networking, graphic design..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="interests">Career Interests</Label>
                          <Textarea
                            id="interests"
                            rows={3}
                            value={interestsInput}
                            onChange={(e) => setInterestsInput(e.target.value)}
                            placeholder="Product, cybersecurity, AI, entrepreneurship..."
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="linkedin-url">LinkedIn URL</Label>
                          <Input
                            id="linkedin-url"
                            value={careerProfile.linkedin_url || ''}
                            onChange={(e) => setCareerProfile((prev) => ({ ...prev, linkedin_url: e.target.value }))}
                            placeholder="https://linkedin.com/in/..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="portfolio-url">Portfolio URL</Label>
                          <Input
                            id="portfolio-url"
                            value={careerProfile.portfolio_url || ''}
                            onChange={(e) => setCareerProfile((prev) => ({ ...prev, portfolio_url: e.target.value }))}
                            placeholder="https://yourportfolio.com"
                          />
                        </div>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between rounded-xl border border-border/70 p-4">
                        <div>
                          <p className="font-medium">Open to mentoring</p>
                          <p className="text-xs text-muted-foreground">
                            Let other students discover you as a mentor or alumni-style guide.
                          </p>
                        </div>
                        <Button
                          variant={careerProfile.mentor_open ? 'default' : 'outline'}
                          onClick={() => setCareerProfile((prev) => ({ ...prev, mentor_open: !prev.mentor_open }))}
                        >
                          {careerProfile.mentor_open ? 'Open' : 'Closed'}
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="mentor-bio">Mentor Bio</Label>
                        <Textarea
                          id="mentor-bio"
                          rows={3}
                          value={careerProfile.mentor_bio || ''}
                          onChange={(e) => setCareerProfile((prev) => ({ ...prev, mentor_bio: e.target.value }))}
                          placeholder="What can you help other students with?"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="mentorship-topics">Mentorship Topics</Label>
                        <Textarea
                          id="mentorship-topics"
                          rows={2}
                          value={mentorshipTopicsInput}
                          onChange={(e) => setMentorshipTopicsInput(e.target.value)}
                          placeholder="Internships, CV reviews, interview prep, freelancing..."
                        />
                      </div>

                      <Button onClick={handleCareerSave} disabled={savingCareer} className="gap-2">
                        {savingCareer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Career Center
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Recommended Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recommendations.slice(0, 4).map((opportunity) => (
                    <div key={opportunity.id} className="rounded-xl border border-border/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{opportunity.title}</p>
                          <p className="text-sm text-muted-foreground">{opportunity.company}</p>
                        </div>
                        <Badge>{opportunity.recommendation_score}</Badge>
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {opportunity.recommendation_reasons?.map((reason) => (
                          <p key={reason}>{reason}</p>
                        ))}
                      </div>
                      <Button asChild variant="outline" size="sm" className="mt-3">
                        <Link to={`/opportunities/${opportunity.id}`}>View Opportunity</Link>
                      </Button>
                    </div>
                  ))}
                  {!careerLoading && recommendations.length === 0 && (
                    <p className="text-sm text-muted-foreground">Add skills and interests above to unlock smarter recommendations.</p>
                  )}
                </CardContent>
              </Card>

            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Account Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile Completion</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Current status</span>
                    <Badge variant={completionSummary.percentage === 100 ? 'default' : 'secondary'}>
                      {completionSummary.statusLabel}
                    </Badge>
                  </div>
                  <Progress value={completionSummary.percentage} className="h-2.5" />
                  <p className="text-sm font-medium">{completionSummary.percentage}% complete</p>
                  {completionSummary.remaining.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Still needed for 100%:</p>
                      <div className="flex flex-wrap gap-2">
                        {completionSummary.remaining.map((item) => (
                          <Badge key={item.key} variant="outline" className="text-xs">
                            {item.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Your personal profile and career essentials are fully set up.
                    </p>
                  )}
                </CardContent>
              </Card>

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
                      <span className={`font-medium ${profile.email_verified ? 'text-green-600' : 'text-amber-600'}`}>
                        {profile.email_verified ? 'Verified' : 'Pending'}
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bookmark className="h-5 w-5" />
                    Saved Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {savedOpportunities.slice(0, 5).map((opportunity) => (
                    <div key={opportunity.id} className="rounded-lg border border-border/70 p-3">
                      <p className="font-medium text-sm">{opportunity.title}</p>
                      <p className="text-xs text-muted-foreground">{opportunity.company}</p>
                    </div>
                  ))}
                  {!careerLoading && savedOpportunities.length === 0 && (
                    <p className="text-sm text-muted-foreground">Save opportunities to build a shortlist.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BriefcaseBusiness className="h-5 w-5" />
                    Application Tracker
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {applications.slice(0, 5).map((application) => (
                    <div key={application.id} className="rounded-lg border border-border/70 p-3">
                      <p className="font-medium text-sm">{application.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">{application.company}</span>
                        <Badge variant="outline" className="capitalize">{application.status}</Badge>
                      </div>
                    </div>
                  ))}
                  {!careerLoading && applications.length === 0 && (
                    <p className="text-sm text-muted-foreground">Track applications from opportunity pages.</p>
                  )}
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
