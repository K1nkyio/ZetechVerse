import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import SocialShare from '@/components/SocialShare';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Building2,
  Briefcase,
  ExternalLink,
  Loader
} from 'lucide-react';
import { opportunitiesApi, type Opportunity } from '@/api/opportunities.api';

const OpportunityDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOpportunity = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);
        const opportunityData = await opportunitiesApi.getOpportunityById(parseInt(id));
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

    fetchOpportunity();
  }, [id, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
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
        <main className="container mx-auto px-4 py-16 text-center">
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
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Back Button */}
          <Button variant="ghost" asChild className="gap-2">
            <Link to="/opportunities">
              <ArrowLeft className="h-4 w-4" />
              Back to Opportunities
            </Link>
          </Button>

          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
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
              <SocialShare
                title={opportunity.title}
                description={`${opportunity.company} - ${opportunity.type} opportunity`}
              />
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
                    : 'Application closed'
                  }
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
          </div>

          <Separator />

          {/* Description */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Description</h2>
            <div className="prose prose-sm max-w-none text-muted-foreground">
              <p>{opportunity.description}</p>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Requirements */}
            {opportunity.requirements && opportunity.requirements.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Requirements</h3>
                <ul className="space-y-2">
                  {opportunity.requirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-1">•</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Benefits */}
            {opportunity.benefits && opportunity.benefits.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Benefits</h3>
                <ul className="space-y-2">
                  {opportunity.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-1">•</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Salary Information */}
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

          {/* Apply Button */}
          <div className="pt-6 border-t">
            {opportunity.application_url ? (
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <a href={opportunity.application_url} target="_blank" rel="noopener noreferrer">
                  Apply Now
                  <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            ) : (
              <Button size="lg" className="w-full sm:w-auto" disabled>
                Application Closed
              </Button>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OpportunityDetail;
