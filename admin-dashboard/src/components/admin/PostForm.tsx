import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImagePlus, Save, Send, Upload, Video, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadsApi } from "@/api/uploads.api";

interface PostFormData {
  title: string;
  category: string;
  content: string;
  excerpt: string;
  featuredImage: string;
  videoUrl: string;
  tags: string[];
  status: 'draft' | 'pending' | 'published' | 'rejected';
}

interface PostFormProps {
  initialData?: Partial<PostFormData>;
  onSubmit: (data: PostFormData) => void | Promise<void>;
  onCancel?: () => void;
  isEditing?: boolean;
}

const categories = [
  "Technology",
  "Design",
  "Development",
  "AI & ML",
  "Startup",
  "Careers",
  "Tutorial",
  "News",
  "Finance",
  "Health",
  "Education",
  "Entertainment",
  "Sports",
  "Travel",
  "Food",
  "Relationship",
  "Spirituality",
  "Gardening",
  "Cooking",
  "Beauty",
  "Personal Development",
  "Mindfulness",
];

export function PostForm({ initialData, onSubmit, onCancel, isEditing }: PostFormProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<PostFormData>({
    title: initialData?.title || "",
    category: initialData?.category || "",
    content: initialData?.content || "",
    excerpt: initialData?.excerpt || "",
    featuredImage: initialData?.featuredImage || "",
    videoUrl: initialData?.videoUrl || "",
    tags: initialData?.tags || [],
    status: initialData?.status || 'draft',
  });
  const [tagInput, setTagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleChange = (field: keyof PostFormData, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      handleChange("tags", [...formData.tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    handleChange("tags", formData.tags.filter((t) => t !== tag));
  };

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

      if (uploaded.media_type === 'video') {
        setFormData((prev) => ({ ...prev, videoUrl: uploaded.url }));
      } else {
        setFormData((prev) => ({ ...prev, featuredImage: uploaded.url }));
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

  const handleSubmit = async (status: 'draft' | 'pending') => {
    const title = formData.title.trim();
    const content = formData.content.trim();
    const excerpt = formData.excerpt.trim();

    if (!title) {
      toast({
        title: "Error",
        description: "Please enter a title",
        variant: "destructive",
      });
      return;
    }
    if (title.length < 5 || title.length > 255) {
      toast({
        title: "Error",
        description: "Title must be between 5 and 255 characters",
        variant: "destructive",
      });
      return;
    }
    if (!formData.category) {
      toast({
        title: "Error",
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }
    if (!content) {
      toast({
        title: "Error",
        description: "Please enter content",
        variant: "destructive",
      });
      return;
    }
    if (content.length < 50) {
      toast({
        title: "Error",
        description: "Content must be at least 50 characters",
        variant: "destructive",
      });
      return;
    }
    if (excerpt.length > 500) {
      toast({
        title: "Error",
        description: "Excerpt must be less than 500 characters",
        variant: "destructive",
      });
      return;
    }
    if (formData.featuredImage.trim().length > 500) {
      toast({
        title: "Error",
        description: "Featured image URL must be less than 500 characters",
        variant: "destructive",
      });
      return;
    }
    if (formData.videoUrl.trim().length > 500) {
      toast({
        title: "Error",
        description: "Video URL must be less than 500 characters",
        variant: "destructive",
      });
      return;
    }
    if (!Array.isArray(formData.tags)) {
      toast({
        title: "Error",
        description: "Tags must be a valid list",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({ ...formData, status, title, content, excerpt });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="font-display">
              {isEditing ? 'Edit Post' : 'Create New Post'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Enter post title..."
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className="text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                placeholder="Brief description of your post..."
                value={formData.excerpt}
                onChange={(e) => handleChange("excerpt", e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Write your post content here..."
                value={formData.content}
                onChange={(e) => handleChange("content", e.target.value)}
                rows={15}
                className="min-h-[400px] resize-y"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="text-base font-display">Post Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleChange("category", value)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                />
                <Button type="button" variant="secondary" onClick={addTag}>
                  Add
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader>
            <CardTitle className="text-base font-display">Post Media</CardTitle>
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

            {formData.featuredImage && (
              <div className="relative">
                <img
                  src={formData.featuredImage}
                  alt="Featured"
                  className="w-full h-40 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => handleChange("featuredImage", "")}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="absolute bottom-2 left-2 bg-background/90 px-2 py-1 rounded text-xs flex items-center gap-1">
                  <ImagePlus className="h-3 w-3" />
                  Image
                </div>
              </div>
            )}

            {formData.videoUrl && (
              <div className="relative">
                <video
                  src={formData.videoUrl}
                  controls
                  className="w-full h-40 object-cover rounded-lg bg-black"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => handleChange("videoUrl", "")}
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
              <Label htmlFor="featuredImage">Image URL</Label>
              <Input
                id="featuredImage"
                placeholder="https://example.com/cover.jpg"
                value={formData.featuredImage}
                onChange={(e) => handleChange("featuredImage", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="videoUrl">Video URL</Label>
              <Input
                id="videoUrl"
                placeholder="https://example.com/video.mp4"
                value={formData.videoUrl}
                onChange={(e) => handleChange("videoUrl", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardContent className="pt-6 space-y-3">
            <Button
              className="w-full gradient-primary text-primary-foreground"
              onClick={() => void handleSubmit('pending')}
              disabled={submitting || uploading}
            >
              <Send className="mr-2 h-4 w-4" />
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => void handleSubmit('draft')}
              disabled={submitting || uploading}
            >
              <Save className="mr-2 h-4 w-4" />
              {submitting ? 'Saving...' : 'Save as Draft'}
            </Button>
            {onCancel && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={onCancel}
                disabled={submitting || uploading}
              >
                Cancel
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
