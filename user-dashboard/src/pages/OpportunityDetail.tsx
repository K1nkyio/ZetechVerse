import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import SocialShare from '@/components/SocialShare';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Building2,
  Briefcase,
  ExternalLink,
  Loader,
  Bookmark,
  BookmarkCheck,
  Upload,
  FileText,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { opportunitiesApi, type Opportunity } from '@/api/opportunities.api';
import { careerApi, type ApplicationTrackerItem } from '@/api/career.api';
import { uploadsApi } from '@/api/uploads.api';
import { apiClient } from '@/api/base';

const OpportunityDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applicationDialogOpen, setApplicationDialogOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [resumeFilename, setResumeFilename] = useState('');
  const [uploadingResume, setUploadingResume] = useState(false);
  const [submittingApplication, setSubmittingApplication] = useState(false);
  const [applicationRecord, setApplicationRecord] = useState<ApplicationTrackerItem | null>(null);

  const requireAuth = (actionText: string) => {
    const token = apiClient.getToken();
    if (!token) {
      toast({
        title: 'Login required',
        description: `Please log in to ${actionText}.`,
        variant: 'destructive',
      });
      navigate('/login', { state: { from: location } });
      return false;
    }
    return true;
  };

  useEffect(() => {
    const fetchOpportunity = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);
        const opportunityData = await opportunitiesApi.getOpportunityById(parseInt(id, 10));
        setOpportunity(opportunityData);
      } catch (err: any) {
        console.error('Failed to fetch opportunity:', err);
        setError(err.message || 'Failed to load opportunity');
        toast({
          title: 'Error',
          description: 'Failed to load opportunity details',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    void fetchOpportunity();
  }, [id, toast]);

  useEffect(() => {
    const loadCareerState = async () => {
      if (!id || !apiClient.getToken()) return;

      try {
        const [savedOpportunities, applications, careerProfile] = await Promise.all([
          careerApi.getSavedOpportunities(),
          careerApi.getApplications(),
          careerApi.getProfile(),
        ]);

        const opportunityId = Number(id);
        setSaved(savedOpportunities.some((item) => Number(item.id) === opportunityId));

        const trackedApplication = applications.find(
          (item) => Number(item.opportunity_id) === opportunityId
        ) || null;

        setApplicationRecord(trackedApplication);
        setResumeUrl(careerProfile.resume_url || trackedApplication?.resume_url || '');
        setResumeFilename(careerProfile.resume_filename || '');
        setCoverLetter(trackedApplication?.cover_letter || '');
        setAdditionalInfo(trackedApplication?.additional_info || '');
      } catch (err) {
        console.error('Failed to load career state:', err);
      }
    };

    void loadCareerState();
  }, [id]);

  const handleResumeUpload = async (file?: File | null) => {
    if (!file) return;
    if (!requireAuth('upload your CV')) return;

    try {
      setUploadingResume(true);
      const uploaded = await uploadsApi.uploadMedia(file);

      if (uploaded.media_type !== 'document') {
        throw new Error('Please upload a PDF or Word document for your CV.');
      }

      setResumeUrl(uploaded.url);
      setResumeFilename(uploaded.filename);
      toast({
        title: 'CV uploaded',
        description: 'Your CV is ready to attach to this application.',
      });
    } catch (err: any) {
      toast({
        title: 'Upload failed',
        description: err.message || 'Failed to upload CV',
        variant: 'destructive',
      });
    } finally {
      setUploadingResume(false);
    }
  };

  const handleSaveOpportunity = async () => {
    if (!id) return;
    if (!requireAuth('save opportunities')) return;
    if (saving) return;

    try {
      setSaving(true);
      const response = await careerApi.toggleSavedOpportunity(Number(id));
      setSaved(response.saved);
      toast({
        title: response.saved ? 'Saved' : 'Removed',
        description: response.saved
          ? 'Added to your career shortlist.'
          : 'Removed from your saved opportunities.',
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to update saved opportunity',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitApplication = async () => {
    if (!id) return;
    if (!requireAuth('track applications')) return;

    try {
      setSubmittingApplication(true);
      const result = await careerApi.submitApplication(Number(id), {
        cover_letter: coverLetter.trim() || undefined,
        resume_url: resumeUrl || undefined,
        additional_info: additionalInfo.trim() || undefined,
      });

      const updatedApplications = await careerApi.getApplications();
      const tracked = updatedApplications.find((item) => Number(item.opportunity_id) === Number(id)) || null;
      setApplicationRecord(tracked);
      setApplicationDialogOpen(false);

      toast({
        title: 'Application tracked',
        description: result.external_application_url
          ? 'Saved in your tracker. You can now continue to the external application.'
          : 'Saved in your application tracker.',
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to save your application',
        variant: 'destructive',
      });
    } finally {
      setSubmittingApplication(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-3 sm:px-4 py-16">
          <div className="w-full">
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-3 sm:px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Opportunity Not Found</h1>
          <p className="text-muted-foreground mb-8">The opportunity you're looking for doesn't exist or has been removed.</p>
          <Button asChild>
            <Link to="/opportunities">Back to Opportunities</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-3 sm:px-4 py-8">
        <div className="w-full space-y-8">
          <Button variant="ghost" asChild className="gap-2">
            <Link to="/opportunities">
              <ArrowLeft className="h-4 w-4" />
              Back to Opportunities
            </Link>
          </Button>

          <div className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <Badge variant="outline" className="capitalize">
                  {opportunity.type}
                </Badge>
                <h1 className="text-3xl font-bold">{opportunity.title}</h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{opportunity.company}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant={saved ? 'default' : 'outline'}
                  className="gap-2"
                  onClick={handleSaveOpportunity}
                  disabled={saving}
                >
                  {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                  {saved ? 'Saved' : 'Save'}
                </Button>
                <Button
                  className="gap-2"
                  onClick={() => {
                    if (!requireAuth('track applications')) return;
                    setApplicationDialogOpen(true);
                  }}
                >
                  <FileText className="h-4 w-4" />
                  {applicationRecord ? 'Update Tracker' : 'Track Application'}
                </Button>
                <SocialShare
                  title={opportunity.title}
                  description={`${opportunity.company} - ${opportunity.type} opportunity`}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {opportunity.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {opportunity.location}
                </div>
              )}
              {opportunity.days_until_deadline !== undefined && (
                <div className={`flex items-center gap-1 ${opportunity.days_until_deadline <= 7 && opportunity.days_until_deadline > 0 ? 'text-destructive' : ''}`}>
                  <Clock className="h-4 w-4" />
                  {opportunity.days_until_deadline > 0
                    ? `${opportunity.days_until_deadline} days left to apply`
                    : opportunity.days_until_deadline === 0
                    ? 'Deadline today'
                    : 'Application closed'}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Briefcase className="h-4 w-4" />
                {opportunity.views_count} views
              </div>
            </div>

            {opportunity.is_expired && (
              <Badge variant="secondary">This opportunity has expired</Badge>
            )}

            {applicationRecord && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Application tracker active
                </div>
                <p className="mt-1">
                  Status: <span className="font-medium capitalize">{applicationRecord.status}</span>
                  {' '}• Saved on {new Date(applicationRecord.applied_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Description</h2>
            <div className="prose prose-sm max-w-none text-muted-foreground">
              <p>{opportunity.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xl:gap-10 items-start">
            {opportunity.requirements && opportunity.requirements.length > 0 && (
              <div className="space-y-4 rounded-2xl border border-border/70 bg-card/40 p-5 md:p-6 h-full">
                <h3 className="text-lg font-semibold">Requirements</h3>
                <ul className="space-y-3 text-sm md:text-base text-muted-foreground leading-relaxed">
                  {opportunity.requirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span aria-hidden="true" className="text-primary mt-1 leading-none">&bull;</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {opportunity.benefits && opportunity.benefits.length > 0 && (
              <div className="space-y-4 rounded-2xl border border-border/70 bg-card/40 p-5 md:p-6 h-full">
                <h3 className="text-lg font-semibold">Benefits</h3>
                <ul className="space-y-3 text-sm md:text-base text-muted-foreground leading-relaxed">
                  {opportunity.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span aria-hidden="true" className="text-primary mt-1 leading-none">&bull;</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {opportunity.responsibilities && opportunity.responsibilities.length > 0 && (
              <div className="space-y-4 rounded-2xl border border-border/70 bg-card/40 p-5 md:p-6 h-full">
                <h3 className="text-lg font-semibold">Responsibilities</h3>
                <ul className="space-y-3 text-sm md:text-base text-muted-foreground leading-relaxed">
                  {opportunity.responsibilities.map((responsibility, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span aria-hidden="true" className="text-primary mt-1 leading-none">&bull;</span>
                      <span>{responsibility}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {(opportunity.salary_min || opportunity.salary_max) && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Compensation</h3>
              <div className="flex items-center gap-4">
                {opportunity.salary_min && opportunity.salary_max ? (
                  <span className="text-lg font-medium">
                    {opportunity.currency} {opportunity.salary_min.toLocaleString()} - {opportunity.currency} {opportunity.salary_max.toLocaleString()}
                  </span>
                ) : opportunity.salary_min ? (
                  <span className="text-lg font-medium">
                    From {opportunity.currency} {opportunity.salary_min.toLocaleString()}
                  </span>
                ) : opportunity.salary_max ? (
                  <span className="text-lg font-medium">
                    Up to {opportunity.currency} {opportunity.salary_max.toLocaleString()}
                  </span>
                ) : null}
                {opportunity.is_paid ? (
                  <Badge variant="default">Paid</Badge>
                ) : (
                  <Badge variant="outline">Unpaid</Badge>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-4 rounded-2xl border border-border/70 bg-card/40 p-5 md:p-6 md:grid-cols-[1.3fr_1fr]">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                Career moat features active
              </div>
              <p className="text-sm text-muted-foreground">
                Save this role, attach your CV, track application progress, and keep your opportunity pipeline organized from one place.
              </p>
              {resumeUrl && (
                <p className="text-xs text-muted-foreground">
                  CV ready: {resumeFilename || 'Uploaded document'}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <Button size="lg" onClick={() => {
                if (!requireAuth('track applications')) return;
                setApplicationDialogOpen(true);
              }}>
                {applicationRecord ? 'Update Application Tracker' : 'Track This Opportunity'}
              </Button>
              {opportunity.application_url ? (
                <Button size="lg" variant="outline" asChild>
                  <a href={opportunity.application_url} target="_blank" rel="noopener noreferrer">
                    Apply Externally
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              ) : (
                <Button size="lg" variant="outline" disabled>
                  Application Closed
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>

      <Dialog open={applicationDialogOpen} onOpenChange={setApplicationDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Track your application</DialogTitle>
            <DialogDescription>
              Save your cover letter, CV, and notes so this opportunity stays organized in your career tracker.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cover-letter">Cover letter</Label>
              <Textarea
                id="cover-letter"
                rows={6}
                value={coverLetter}
                onChange={(event) => setCoverLetter(event.target.value)}
                placeholder="Why are you a strong fit for this opportunity?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="additional-info">Additional notes</Label>
              <Textarea
                id="additional-info"
                rows={4}
                value={additionalInfo}
                onChange={(event) => setAdditionalInfo(event.target.value)}
                placeholder="Interview prep notes, deadlines, or contact details..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resume-upload">CV / Resume</Label>
              <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border p-4">
                <Input
                  id="resume-upload"
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(event) => void handleResumeUpload(event.target.files?.[0] || null)}
                />
                {uploadingResume ? (
                  <div className="text-sm text-muted-foreground">Uploading CV...</div>
                ) : resumeUrl ? (
                  <a href={resumeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                    <Upload className="h-4 w-4" />
                    {resumeFilename || 'Open uploaded CV'}
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">Upload a PDF or Word document to reuse across applications.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setApplicationDialogOpen(false)} disabled={submittingApplication}>
                Cancel
              </Button>
              <Button onClick={handleSubmitApplication} disabled={submittingApplication}>
                {submittingApplication ? 'Saving...' : 'Save to Tracker'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
};

export default OpportunityDetail;
