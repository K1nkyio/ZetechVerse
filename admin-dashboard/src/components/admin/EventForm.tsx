import { useRef, useState } from "react";
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
import { Plus, Save, Upload, Video, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadsApi } from "@/api/uploads.api";
import type { CreateEventData, Event } from "@/api/events.api";

interface EventFormProps {
  initialData?: Event;
  onSubmit: (data: CreateEventData) => Promise<void>;
  onCancel?: () => void;
  isEditing?: boolean;
}

const toDateTimeLocal = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function EventForm({ initialData, onSubmit, onCancel, isEditing }: EventFormProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [formData, setFormData] = useState<CreateEventData>({
    title: initialData?.title || "",
    description: initialData?.description || "",
    start_date: toDateTimeLocal(initialData?.start_date),
    end_date: toDateTimeLocal(initialData?.end_date),
    location: initialData?.location || "",
    venue_details: initialData?.venue_details || "",
    type: initialData?.type || "workshop",
    max_attendees: initialData?.max_attendees || undefined,
    registration_deadline: toDateTimeLocal(initialData?.registration_deadline),
    ticket_price: initialData?.ticket_price || 0,
    is_paid: initialData?.is_paid ?? false,
    registration_required: initialData?.registration_required ?? true,
    image_url: initialData?.image_url || "",
    video_url: initialData?.video_url || "",
    agenda: initialData?.agenda || [],
    requirements: initialData?.requirements || [],
    contact_email: initialData?.contact_email || "",
    contact_phone: initialData?.contact_phone || "",
    website_url: initialData?.website_url || "",
    status: initialData?.status || "published",
  });

  const [agendaItem, setAgendaItem] = useState("");
  const [requirementInput, setRequirementInput] = useState("");

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast({
        title: "Invalid file",
        description: "Please upload an image or video file",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      const uploaded = await uploadsApi.uploadMedia(file);

      if (uploaded.media_type === "video") {
        setFormData((prev) => ({ ...prev, video_url: uploaded.url }));
      } else {
        setFormData((prev) => ({ ...prev, image_url: uploaded.url }));
      }

      toast({
        title: "Upload complete",
        description: `${file.name} uploaded successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload media",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = async (files: FileList) => {
    for (const file of Array.from(files)) {
      await uploadFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      void handleFiles(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      void handleFiles(files);
    }
  };

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

    if (!formData.start_date || !formData.end_date) {
      toast({
        title: "Validation Error",
        description: "Start date and end date are required",
        variant: "destructive",
      });
      return;
    }

    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    const regDeadline = formData.registration_deadline ? new Date(formData.registration_deadline) : null;

    if (endDate <= startDate) {
      toast({
        title: "Validation Error",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    if (regDeadline && regDeadline >= startDate) {
      toast({
        title: "Validation Error",
        description: "Registration deadline must be before event start date",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const submitData: CreateEventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        type: formData.type || "workshop",
        status: formData.status,
        location: formData.location?.trim() || undefined,
        venue_details: formData.venue_details?.trim() || undefined,
        registration_deadline: regDeadline ? regDeadline.toISOString() : undefined,
        max_attendees: formData.max_attendees ? Number(formData.max_attendees) : undefined,
        ticket_price: formData.ticket_price ? Number(formData.ticket_price) : 0,
        is_paid: Boolean(formData.is_paid),
        registration_required: Boolean(formData.registration_required),
        image_url: formData.image_url?.trim() || undefined,
        video_url: formData.video_url?.trim() || undefined,
        agenda: formData.agenda?.length ? formData.agenda : undefined,
        requirements: formData.requirements?.length ? formData.requirements : undefined,
        contact_email: formData.contact_email?.trim() || undefined,
        contact_phone: formData.contact_phone?.trim() || undefined,
        website_url: formData.website_url?.trim() || undefined,
      };

      await onSubmit(submitData);
      toast({
        title: "Success",
        description: isEditing ? "Event updated successfully" : "Event created successfully",
      });
    } catch (error: any) {
      let errorDescription = error.message || "Failed to save event";
      if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
        errorDescription = error.errors
          .map((err: any) => {
            const field = err.field || err.path || err.param || 'unknown';
            const message = err.message || err.msg || 'Validation failed';
            return `${field}: ${message}`;
          })
          .join("; ");
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

  const addAgendaItem = () => {
    if (agendaItem.trim()) {
      setFormData((prev) => ({
        ...prev,
        agenda: [...(prev.agenda || []), agendaItem.trim()],
      }));
      setAgendaItem("");
    }
  };

  const removeAgendaItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      agenda: prev.agenda?.filter((_, i) => i !== index) || [],
    }));
  };

  const addRequirement = () => {
    if (requirementInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        requirements: [...(prev.requirements || []), requirementInput.trim()],
      }));
      setRequirementInput("");
    }
  };

  const removeRequirement = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      requirements: prev.requirements?.filter((_, i) => i !== index) || [],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
              placeholder="e.g., AI Workshop 2026"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the event in detail..."
              rows={6}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Event Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="hackathon">Hackathon</SelectItem>
                  <SelectItem value="competition">Competition</SelectItem>
                  <SelectItem value="seminar">Seminar</SelectItem>
                  <SelectItem value="social">Social Event</SelectItem>
                  <SelectItem value="cultural">Cultural Event</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="admin-card">
        <CardHeader>
          <CardTitle>Date & Time</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date & Time *</Label>
              <Input
                id="start_date"
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date & Time *</Label>
              <Input
                id="end_date"
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="registration_deadline">Registration Deadline</Label>
            <Input
              id="registration_deadline"
              type="datetime-local"
              value={formData.registration_deadline || ""}
              onChange={(e) => setFormData({ ...formData, registration_deadline: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="admin-card">
        <CardHeader>
          <CardTitle>Location & Venue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location || ""}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Main Campus, Room 101"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="venue_details">Venue Details</Label>
            <Textarea
              id="venue_details"
              value={formData.venue_details || ""}
              onChange={(e) => setFormData({ ...formData, venue_details: e.target.value })}
              placeholder="Additional venue information..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="admin-card">
        <CardHeader>
          <CardTitle>Registration & Capacity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="registration_required"
              checked={Boolean(formData.registration_required)}
              onCheckedChange={(checked) => setFormData({ ...formData, registration_required: checked })}
            />
            <Label htmlFor="registration_required">Registration Required</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_attendees">Maximum Attendees</Label>
            <Input
              id="max_attendees"
              type="number"
              min="1"
              value={formData.max_attendees || ""}
              onChange={(e) => setFormData({ ...formData, max_attendees: e.target.value ? parseInt(e.target.value, 10) : undefined })}
              placeholder="Leave empty for unlimited"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_paid"
              checked={Boolean(formData.is_paid)}
              onCheckedChange={(checked) => setFormData({ ...formData, is_paid: checked })}
            />
            <Label htmlFor="is_paid">Paid Event</Label>
          </div>

          {formData.is_paid && (
            <div className="space-y-2">
              <Label htmlFor="ticket_price">Ticket Price (KES)</Label>
              <Input
                id="ticket_price"
                type="number"
                min="0"
                step="0.01"
                value={formData.ticket_price || ""}
                onChange={(e) => setFormData({ ...formData, ticket_price: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="admin-card">
        <CardHeader>
          <CardTitle>Event Agenda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={agendaItem}
              onChange={(e) => setAgendaItem(e.target.value)}
              placeholder="Add agenda item..."
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addAgendaItem();
                }
              }}
            />
            <Button type="button" onClick={addAgendaItem} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {formData.agenda?.map((item, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                <span className="flex-1">{item}</span>
                <button
                  type="button"
                  onClick={() => removeAgendaItem(index)}
                  className="text-destructive hover:text-destructive/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="admin-card">
        <CardHeader>
          <CardTitle>Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={requirementInput}
              onChange={(e) => setRequirementInput(e.target.value)}
              placeholder="Add requirement..."
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

      <Card className="admin-card">
        <CardHeader>
          <CardTitle>Media & Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/30 hover:border-muted-foreground/60"
            }`}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="font-medium mb-1">Drag and drop images here</p>
            <p className="text-sm text-muted-foreground mb-1">or click to select files</p>
            <p className="text-xs text-muted-foreground">Image and video files are supported</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          {uploading && (
            <p className="text-sm text-muted-foreground">Uploading media...</p>
          )}

          {formData.image_url && (
            <div className="relative">
              <img
                src={formData.image_url}
                alt="Event"
                className="w-full h-40 object-cover rounded-lg"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={() => setFormData({ ...formData, image_url: "" })}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {formData.video_url && (
            <div className="relative">
              <video
                src={formData.video_url}
                controls
                className="w-full h-40 object-cover rounded-lg bg-black"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={() => setFormData({ ...formData, video_url: "" })}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="absolute bottom-2 left-2 bg-background/90 px-2 py-1 rounded text-xs flex items-center gap-1">
                <Video className="h-3 w-3" />
                Video
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="image_url">Event Image URL</Label>
            <Input
              id="image_url"
              type="url"
              value={formData.image_url || ""}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              placeholder="https://example.com/event-image.jpg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="video_url">Event Video URL</Label>
            <Input
              id="video_url"
              type="url"
              value={formData.video_url || ""}
              onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
              placeholder="https://example.com/event-video.mp4"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email || ""}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="events@zetech.ac.ke"
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
            <Label htmlFor="website_url">Website/Registration URL</Label>
            <Input
              id="website_url"
              type="url"
              value={formData.website_url || ""}
              onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
              placeholder="https://zetech.ac.ke/events/ai-workshop"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading || uploading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading || uploading} className="gradient-primary text-primary-foreground">
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Saving..." : isEditing ? "Update Event" : "Create Event"}
        </Button>
      </div>
    </form>
  );
}
