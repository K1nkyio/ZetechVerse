import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { CreateConfessionData, Confession } from "@/api/confessions.api";

interface ConfessionFormProps {
  initialData?: Confession;
  onSubmit: (data: CreateConfessionData) => Promise<void>;
  onCancel?: () => void;
  isEditing?: boolean;
}

export function ConfessionForm({ initialData, onSubmit, onCancel, isEditing }: ConfessionFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateConfessionData>({
    content: initialData?.content || "",
    category_id: initialData?.category_id,
    is_anonymous: initialData?.is_anonymous ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter your confession content",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await onSubmit(formData);
      toast({
        title: "Success",
        description: isEditing ? "Confession updated successfully" : "Confession submitted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save confession",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Content */}
      <Card className="admin-card">
        <CardHeader>
          <CardTitle>Your Confession</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Share your thoughts anonymously..."
              rows={8}
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_anonymous"
              checked={formData.is_anonymous}
              onCheckedChange={(checked) => setFormData({ ...formData, is_anonymous: checked })}
            />
            <Label htmlFor="is_anonymous">Post anonymously</Label>
          </div>

          {!isEditing && (
            <div className="text-sm text-muted-foreground">
              <p>• Your confession will be reviewed by moderators before being published</p>
              <p>• Anonymous posts help protect your privacy</p>
              <p>• You can request to delete your confession at any time</p>
            </div>
          )}
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
          {loading ? "Submitting..." : isEditing ? "Update Confession" : "Submit Confession"}
        </Button>
      </div>
    </form>
  );
}

