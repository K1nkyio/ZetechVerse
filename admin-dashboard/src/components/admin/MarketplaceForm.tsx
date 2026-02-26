import { useState, useEffect, useRef } from "react";
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
import { X, Plus, Save, Upload, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { marketplaceApi, type CreateMarketplaceListingData, type MarketplaceListing } from "@/api/marketplace.api";

interface MarketplaceFormProps {
  initialData?: MarketplaceListing;
  onSubmit: (data: CreateMarketplaceListingData) => Promise<void>;
  onCancel?: () => void;
  isEditing?: boolean;
}

export function MarketplaceForm({ initialData, onSubmit, onCancel, isEditing }: MarketplaceFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: number; name: string; slug: string }>>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<CreateMarketplaceListingData>({
    title: initialData?.title || "",
    description: initialData?.description || "",
    price: initialData?.price || 0,
    category_id: initialData?.category_id,
    location: initialData?.location || "",
    condition: initialData?.condition || "used",
    phone: initialData?.phone || "",
    image_urls: initialData?.image_urls || [],
    tags: initialData?.tags || [],
    contact_method: initialData?.contact_method || "in_app",
    is_negotiable: initialData?.is_negotiable ?? false,
    urgent: initialData?.urgent ?? false,
    expires_at: initialData?.expires_at ? new Date(initialData.expires_at).toISOString() : "",
  });

  const [imageUrlInput, setImageUrlInput] = useState("");
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    let mounted = true;

    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const data = await marketplaceApi.getCategories();
        if (mounted) {
          setCategories(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to fetch marketplace categories:", error);
        if (mounted) {
          toast({
            title: "Category Load Error",
            description: "Failed to load marketplace categories. Please refresh and try again.",
            variant: "destructive",
          });
        }
      } finally {
        if (mounted) setCategoriesLoading(false);
      }
    };

    fetchCategories();
    return () => {
      mounted = false;
    };
  }, [toast]);

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

    if (!formData.description || formData.description.length < 10) {
      toast({
        title: "Validation Error",
        description: "Description must be at least 10 characters long",
        variant: "destructive",
      });
      return;
    }

    if (!formData.price || formData.price <= 0) {
      toast({
        title: "Validation Error",
        description: "Price must be a positive number",
        variant: "destructive",
      });
      return;
    }

    if (!formData.category_id) {
      toast({
        title: "Validation Error",
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Convert date value to full ISO8601 format for API and clean up data
      console.log('🔄 Transforming marketplace form data for API submission...');
      console.log('Original form data:', formData);

      let submitData: any = {
        title: formData.title,
        description: formData.description,
        price: Number(formData.price),
        category_id: Number(formData.category_id),
      };

      // Add optional fields only if they have values
      if (formData.condition) submitData.condition = formData.condition;
      if (formData.status) submitData.status = formData.status;
      if (formData.phone) submitData.phone = formData.phone;
      if (formData.contact_method) submitData.contact_method = formData.contact_method;
      if (formData.location) submitData.location = formData.location;
      if (formData.expires_at) submitData.expires_at = new Date(formData.expires_at).toISOString();
      if (formData.is_negotiable !== undefined) submitData.is_negotiable = formData.is_negotiable;
      if (formData.urgent !== undefined) submitData.urgent = formData.urgent;
      if (formData.tags && formData.tags.length > 0) submitData.tags = formData.tags;
      if (formData.image_urls && formData.image_urls.length > 0) submitData.image_urls = formData.image_urls;

      console.log('Transformed submit data:', submitData);

      await onSubmit(submitData);
      toast({
        title: "Success",
        description: isEditing ? "Listing updated successfully" : "Listing created successfully",
      });
    } catch (error: any) {
      console.error('MarketplaceForm error:', error);
      
      // Build detailed error message
      let errorDescription = error.message || "Failed to save listing";
      
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

  const addImageUrl = () => {
    if (imageUrlInput.trim()) {
      setFormData({
        ...formData,
        image_urls: [...(formData.image_urls || []), imageUrlInput.trim()],
      });
      setImageUrlInput("");
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
      handleFiles(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFiles = (files: FileList) => {
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          setFormData({
            ...formData,
            image_urls: [...(formData.image_urls || []), dataUrl],
          });
          toast({
            title: "Image added",
            description: `${file.name} has been added to your listing`,
          });
        };
        reader.readAsDataURL(file);
      } else {
        toast({
          title: "Invalid file",
          description: "Please upload image files only",
          variant: "destructive",
        });
      }
    });
  };

  const removeImageUrl = (index: number) => {
    setFormData({
      ...formData,
      image_urls: formData.image_urls?.filter((_, i) => i !== index) || [],
    });
  };

  const addTag = () => {
    if (tagInput.trim()) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()],
      });
      setTagInput("");
    }
  };

  const removeTag = (index: number) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((_, i) => i !== index) || [],
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
              placeholder="e.g., MacBook Pro 2023"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your item in detail..."
              rows={6}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (KES) *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price || ""}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category_id">Category *</Label>
              <Select
                value={formData.category_id ? String(formData.category_id) : ""}
                onValueChange={(value) => setFormData({ ...formData, category_id: Number(value) })}
              >
                <SelectTrigger id="category_id">
                  <SelectValue placeholder={categoriesLoading ? "Loading categories..." : "Select category"} />
                </SelectTrigger>
                <SelectContent>
                  {categories.length > 0 ? (
                    categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__no_categories" disabled>
                      No categories available
                    </SelectItem>
                  )}
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
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone || ""}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="e.g., +254712345678 or 0712345678"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <Select
                value={formData.condition}
                onValueChange={(value: any) => setFormData({ ...formData, condition: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="used">Used</SelectItem>
                  <SelectItem value="refurbished">Refurbished</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_method">Contact Method</Label>
              <Select
                value={formData.contact_method}
                onValueChange={(value: any) => setFormData({ ...formData, contact_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_app">In-App Messages</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card className="admin-card">
        <CardHeader>
          <CardTitle>Product Images</CardTitle>
          <p className="text-sm text-muted-foreground">Add images by URL or drag and drop files</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URL Input */}
          <div className="space-y-2">
            <Label>Add Image by URL</Label>
            <div className="flex gap-2">
              <Input
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder="Enter image URL..."
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addImageUrl();
                  }
                }}
              />
              <Button type="button" onClick={addImageUrl} variant="outline">
                <Upload className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Drag and Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/30 hover:border-muted-foreground/50"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="font-medium mb-1">Drag and drop images here</p>
            <p className="text-sm text-muted-foreground mb-4">or click to select files</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
            <Button type="button" variant="outline" size="sm">
              Select Images
            </Button>
          </div>

          {/* Image Preview */}
          {formData.image_urls && formData.image_urls.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">Preview ({formData.image_urls.length} images)</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {formData.image_urls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Image ${index + 1}`}
                      className="w-full h-20 object-cover rounded border"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder-image.jpg";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImageUrl(index)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-destructive/90 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove image"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tags */}
      <Card className="admin-card">
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add a tag..."
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            <Button type="button" onClick={addTag} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tags?.map((tag, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Additional Options */}
      <Card className="admin-card">
        <CardHeader>
          <CardTitle>Additional Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="is_negotiable"
              checked={formData.is_negotiable}
              onCheckedChange={(checked) => setFormData({ ...formData, is_negotiable: checked })}
            />
            <Label htmlFor="is_negotiable">Price is negotiable</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="urgent"
              checked={formData.urgent}
              onCheckedChange={(checked) => setFormData({ ...formData, urgent: checked })}
            />
            <Label htmlFor="urgent">Mark as urgent</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expires_at">Expires At</Label>
            <Input
              id="expires_at"
              type="date"
              value={formData.expires_at || ""}
              onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
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
          {loading ? "Saving..." : isEditing ? "Update Listing" : "Create Listing"}
        </Button>
      </div>
    </form>
  );
}
