import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { CreateOpportunityData, Opportunity } from "@/api/opportunities.api";

interface OpportunityFormProps {
  initialData?: Opportunity;
  onSubmit: (data: CreateOpportunityData) => Promise<void>;
  onCancel?: () => void;
  isEditing?: boolean;
}

export function OpportunityForm({ initialData, onSubmit, onCancel, isEditing }: OpportunityFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateOpportunityData>({
    title: initialData?.title || "",
    description: initialData?.description || "",
    company: initialData?.company || "",
    location: initialData?.location || "",
    type: initialData?.type || "internship",
    application_deadline: initialData?.application_deadline
      ? new Date(initialData.application_deadline).toISOString()
      : "",
    start_date: initialData?.start_date
      ? new Date(initialData.start_date).toISOString()
      : "",
    end_date: initialData?.end_date
      ? new Date(initialData.end_date).toISOString()
      : "",
    salary_min: initialData?.salary_min || undefined,
    salary_max: initialData?.salary_max || undefined,
    currency: initialData?.currency || "KES",
    is_paid: initialData?.is_paid ?? false,
    is_remote: initialData?.is_remote ?? false,
    requirements: initialData?.requirements || [],
    benefits: initialData?.benefits || [],
    contact_email: initialData?.contact_email || "",
    contact_phone: initialData?.contact_phone || "",
    application_url: initialData?.application_url || "",
  });

  const [requirementInput, setRequirementInput] = useState("");
  const [benefitInput, setBenefitInput] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || formData.title.length < 5) {
      toast({
        title: "Validation Error",
        description: "Title must be at least 5 characters long",
        variant: "destructive",
      });
      return;
    }

    if (!formData.description || formData.description.length < 20) {
      toast({
        title: "Validation Error",
        description: "Description must be at least 20 characters long",
        variant: "destructive",
      });
      return;
    }

    if (!formData.company || formData.company.length < 2) {
      toast({
        title: "Validation Error",
        description: "Company name must be at least 2 characters long",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Convert date values to full ISO8601 format for API and clean up data
      console.log('🔄 Transforming form data for API submission...');
      console.log('Original form data:', formData);

      let submitData: any = {
        title: formData.title,
        description: formData.description,
        company: formData.company,
        type: formData.type,
      };

      // Add optional fields only if they have values
      if (formData.location) submitData.location = formData.location;
      if (formData.application_deadline) submitData.application_deadline = new Date(formData.application_deadline).toISOString();
      if (formData.start_date) submitData.start_date = new Date(formData.start_date).toISOString();
      if (formData.end_date) submitData.end_date = new Date(formData.end_date).toISOString();
      if (formData.salary_min) submitData.salary_min = Number(formData.salary_min);
      if (formData.salary_max) submitData.salary_max = Number(formData.salary_max);
      if (formData.currency) submitData.currency = formData.currency;
      if (formData.is_paid !== undefined) submitData.is_paid = formData.is_paid;
      if (formData.is_remote !== undefined) submitData.is_remote = formData.is_remote;
      if (formData.requirements && formData.requirements.length > 0) submitData.requirements = formData.requirements;
      if (formData.benefits && formData.benefits.length > 0) submitData.benefits = formData.benefits;
      if (formData.contact_email) submitData.contact_email = formData.contact_email;
      if (formData.contact_phone) submitData.contact_phone = formData.contact_phone;
      if (formData.application_url && formData.application_url.trim()) submitData.application_url = formData.application_url.trim();

      console.log('Transformed submit data:', submitData);

      await onSubmit(submitData);
      toast({
        title: "Success",
        description: isEditing ? "Opportunity updated successfully" : "Opportunity created successfully",
      });
    } catch (error: any) {
      console.error('OpportunityForm error:', error);
      
      // Build detailed error message
      let errorDescription = error.message || "Failed to save opportunity";
      
      if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
        const fieldErrors = error.errors
          .map((err: any) => {
            const field = err.field || err.param || 'unknown';
            const message = err.message || err.msg || 'Validation failed';
            return `${field}: ${message}`;
          })
          .join('; ');
        
        if (fieldErrors) {
          errorDescription = fieldErrors;
          console.error('Validation field errors:', error.errors);
        }
      }
      
      toast({
        title: "Error",
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addRequirement = () => {
    if (requirementInput.trim()) {
      setFormData({
        ...formData,
        requirements: [...(formData.requirements || []), requirementInput.trim()],
      });
      setRequirementInput("");
    }
  };

  const removeRequirement = (index: number) => {
    setFormData({
      ...formData,
      requirements: formData.requirements?.filter((_, i) => i !== index) || [],
    });
  };

  const addBenefit = () => {
    if (benefitInput.trim()) {
      setFormData({
        ...formData,
        benefits: [...(formData.benefits || []), benefitInput.trim()],
      });
      setBenefitInput("");
    }
  };

  const removeBenefit = (index: number) => {
    setFormData({
      ...formData,
      benefits: formData.benefits?.filter((_, i) => i !== index) || [],
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card className="admin-card">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Software Engineering Intern"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company *</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="e.g., Safaricom"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internship">Internship</SelectItem>
                  <SelectItem value="attachment">Attachment</SelectItem>
                  <SelectItem value="job">Job</SelectItem>
                  <SelectItem value="scholarship">Scholarship</SelectItem>
                  <SelectItem value="volunteer">Volunteer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location || ""}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Nairobi, Kenya"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the opportunity in detail..."
              rows={6}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Dates & Duration */}
      <Card className="admin-card">
        <CardHeader>
          <CardTitle>Dates & Duration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="application_deadline">Application Deadline</Label>
              <Input
                id="application_deadline"
                type="date"
                value={formData.application_deadline || ""}
                onChange={(e) => setFormData({ ...formData, application_deadline: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date || ""}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date || ""}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compensation */}
      <Card className="admin-card">
        <CardHeader>
          <CardTitle>Compensation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="is_paid"
              checked={formData.is_paid}
              onCheckedChange={(checked) => setFormData({ ...formData, is_paid: checked })}
            />
            <Label htmlFor="is_paid">This is a paid opportunity</Label>
          </div>

          {formData.is_paid && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salary_min">Minimum Salary</Label>
                <Input
                  id="salary_min"
                  type="number"
                  value={formData.salary_min || ""}
                  onChange={(e) => setFormData({ ...formData, salary_min: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="30000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary_max">Maximum Salary</Label>
                <Input
                  id="salary_max"
                  type="number"
                  value={formData.salary_max || ""}
                  onChange={(e) => setFormData({ ...formData, salary_max: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="50000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KES">KES (Kenyan Shilling)</SelectItem>
                    <SelectItem value="USD">USD (US Dollar)</SelectItem>
                    <SelectItem value="EUR">EUR (Euro)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="is_remote"
              checked={formData.is_remote}
              onCheckedChange={(checked) => setFormData({ ...formData, is_remote: checked })}
            />
            <Label htmlFor="is_remote">Remote work available</Label>
          </div>
        </CardContent>
      </Card>

      {/* Requirements */}
      <Card className="admin-card">
        <CardHeader>
          <CardTitle>Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={requirementInput}
              onChange={(e) => setRequirementInput(e.target.value)}
              placeholder="Add a requirement..."
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRequirement();
                }
              }}
            />
            <Button type="button" onClick={addRequirement} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.requirements?.map((req, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                {req}
                <button
                  type="button"
                  onClick={() => removeRequirement(index)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Benefits */}
      <Card className="admin-card">
        <CardHeader>
          <CardTitle>Benefits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={benefitInput}
              onChange={(e) => setBenefitInput(e.target.value)}
              placeholder="Add a benefit..."
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addBenefit();
                }
              }}
            />
            <Button type="button" onClick={addBenefit} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.benefits?.map((benefit, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                {benefit}
                <button
                  type="button"
                  onClick={() => removeBenefit(index)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="admin-card">
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email || ""}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="hr@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_phone">Contact Phone</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone || ""}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="+254712345678"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="application_url">Application URL</Label>
            <Input
              id="application_url"
              type="url"
              value={formData.application_url || ""}
              onChange={(e) => setFormData({ ...formData, application_url: e.target.value })}
              placeholder="https://company.com/careers/apply"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading} className="gradient-primary text-primary-foreground">
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Saving..." : isEditing ? "Update Opportunity" : "Create Opportunity"}
        </Button>
      </div>
    </form>
  );
}

