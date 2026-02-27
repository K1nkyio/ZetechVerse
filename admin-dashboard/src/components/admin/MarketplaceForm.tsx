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

type ListingKind = "product" | "service" | "hostel";
type ServicePricingModel = NonNullable<NonNullable<CreateMarketplaceListingData["service_details"]>["pricing_model"]>;

const servicePricingModelOptions: Array<{ value: ServicePricingModel; label: string }> = [
  { value: "per_hour", label: "Per Hour" },
  { value: "per_task_assignment", label: "Per Task / Assignment" },
  { value: "subscription_package", label: "Subscription / Package" },
  { value: "pay_per_consultation_meeting", label: "Pay Per Consultation / Meeting" },
  { value: "freemium_addons", label: "Freemium + Add-ons" },
  { value: "tiered_pricing", label: "Tiered Pricing" },
  { value: "pay_what_you_want", label: "Pay What You Want" },
  { value: "commission_performance_based", label: "Commission / Performance-Based" },
  { value: "group_bulk_rate", label: "Group / Bulk Rate" },
  { value: "one_time_flat_fee", label: "One-Time Flat Fee" },
  { value: "sliding_scale_income_based", label: "Sliding Scale / Income-Based" },
  { value: "retainer_monthly_contract", label: "Retainer / Monthly Contract" },
  { value: "hybrid_hourly_task", label: "Hybrid (Hourly + Task)" },
  { value: "trial_paid_upgrade", label: "Trial + Paid Upgrade" },
  { value: "credit_token_system", label: "Credit / Token System" }
];

const inferListingKindFromCategory = (
  categories: Array<{ id: number; name: string; slug: string }>,
  categoryId?: number
): ListingKind => {
  if (!categoryId) return "product";

  const category = categories.find((item) => item.id === categoryId);
  if (!category) return "product";

  const text = `${category.name} ${category.slug}`.toLowerCase();
  if (text.includes("service")) return "service";
  if (text.includes("hostel")) return "hostel";
  return "product";
};

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
    listing_kind: initialData?.listing_kind || "product",
    location: initialData?.location || "",
    condition: initialData?.condition || "used",
    service_details: initialData?.service_details || {},
    hostel_details: initialData?.hostel_details || {},
    phone: initialData?.phone || "",
    image_urls: initialData?.image_urls || [],
    tags: initialData?.tags || [],
    contact_method: initialData?.contact_method || "in_app",
    is_negotiable: initialData?.is_negotiable ?? false,
    urgent: initialData?.urgent ?? false,
    expires_at: initialData?.expires_at ? new Date(initialData.expires_at).toISOString().split("T")[0] : "",
  });

  const [imageUrlInput, setImageUrlInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [amenityInput, setAmenityInput] = useState("");

  const listingKind: ListingKind = (formData.listing_kind || "product") as ListingKind;
  const isProduct = listingKind === "product";
  const isService = listingKind === "service";
  const isHostel = listingKind === "hostel";

  useEffect(() => {
    let mounted = true;

    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const data = await marketplaceApi.getCategories();
        if (mounted) {
          setCategories(Array.isArray(data) ? data : []);
          setFormData((prev) => {
            if (!prev.category_id || initialData?.listing_kind) return prev;

            const inferredKind = inferListingKindFromCategory(Array.isArray(data) ? data : [], prev.category_id);
            if (prev.listing_kind === inferredKind) return prev;

            return {
              ...prev,
              listing_kind: inferredKind,
            };
          });
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
  }, [toast, initialData]);

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

    if (isProduct && !formData.condition) {
      toast({
        title: "Validation Error",
        description: "Please select product condition",
        variant: "destructive",
      });
      return;
    }

    if (isService) {
      const serviceArea = formData.service_details?.service_area?.trim();
      const pricingModel = formData.service_details?.pricing_model;

      if (!serviceArea || !pricingModel) {
        toast({
          title: "Validation Error",
          description: "Service listings need service area and pricing model",
          variant: "destructive",
        });
        return;
      }
    }

    if (isHostel) {
      const roomType = formData.hostel_details?.room_type;
      const bedsAvailable = Number(formData.hostel_details?.beds_available || 0);

      if (!roomType || !bedsAvailable || bedsAvailable < 1) {
        toast({
          title: "Validation Error",
          description: "Hostel listings need room type and available beds",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setLoading(true);

      // Convert date value to full ISO8601 format for API and clean up data
      console.log('🔄 Transforming marketplace form data for API submission...');
      console.log('Original form data:', formData);

      const submitData: {
        title: string;
        description: string;
        price: number;
        category_id: number;
        listing_kind: ListingKind;
        condition?: "new" | "used" | "refurbished" | null;
        status?: "active" | "sold" | "inactive";
        phone?: string;
        contact_method?: "phone" | "email" | "in_app";
        location?: string;
        expires_at?: string;
        is_negotiable?: boolean;
        urgent?: boolean;
        tags?: string[];
        image_urls?: string[];
        service_details?: CreateMarketplaceListingData["service_details"] | null;
        hostel_details?: CreateMarketplaceListingData["hostel_details"] | null;
      } = {
        title: formData.title,
        description: formData.description,
        price: Number(formData.price),
        category_id: Number(formData.category_id),
        listing_kind: listingKind,
      };

      // Add optional fields only if they have values
      submitData.condition = isProduct ? formData.condition : null;
      submitData.service_details = isService ? formData.service_details || {} : null;
      submitData.hostel_details = isHostel ? formData.hostel_details || {} : null;
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
    } catch (error: unknown) {
      console.error('MarketplaceForm error:', error);
      
      // Build detailed error message
      const apiError = error as {
        message?: string;
        errors?: Array<{
          field?: string;
          param?: string;
          message?: string;
          msg?: string;
        }>;
      };

      let errorDescription = apiError.message || "Failed to save listing";
      
      if (apiError.errors && Array.isArray(apiError.errors) && apiError.errors.length > 0) {
        const fieldErrors = apiError.errors
          .map((err) => {
            const field = err.field || err.param || 'unknown';
            const message = err.message || err.msg || 'Validation failed';
            return `${field}: ${message}`;
          })
          .join('; ');
        
        if (fieldErrors) {
          errorDescription = fieldErrors;
          console.error('Validation field errors:', apiError.errors);
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

  const addAmenity = () => {
    if (!amenityInput.trim()) return;

    setFormData({
      ...formData,
      hostel_details: {
        ...(formData.hostel_details || {}),
        amenities: [...(formData.hostel_details?.amenities || []), amenityInput.trim()],
      },
    });
    setAmenityInput("");
  };

  const removeAmenity = (index: number) => {
    setFormData({
      ...formData,
      hostel_details: {
        ...(formData.hostel_details || {}),
        amenities: (formData.hostel_details?.amenities || []).filter((_, i) => i !== index),
      },
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
              <Label htmlFor="price">
                {isHostel ? "Rent Per Month (KES) *" : isService ? "Starting Price (KES) *" : "Price (KES) *"}
              </Label>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="listing_kind">Listing Type *</Label>
              <Select
                value={listingKind}
                onValueChange={(value: ListingKind) => setFormData({ ...formData, listing_kind: value })}
              >
                <SelectTrigger id="listing_kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="hostel">Hostel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category_id">Category *</Label>
              <Select
                value={formData.category_id ? String(formData.category_id) : ""}
                onValueChange={(value) => {
                  const categoryId = Number(value);
                  setFormData({
                    ...formData,
                    category_id: categoryId,
                    listing_kind: inferListingKindFromCategory(categories, categoryId),
                  });
                }}
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
            {isProduct && (
              <div className="space-y-2">
                <Label htmlFor="condition">Condition *</Label>
                <Select
                  value={formData.condition || "used"}
                  onValueChange={(value: "new" | "used" | "refurbished") => setFormData({ ...formData, condition: value })}
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
            )}

            <div className="space-y-2">
              <Label htmlFor="contact_method">Contact Method</Label>
              <Select
                value={formData.contact_method}
                onValueChange={(value: "phone" | "email" | "in_app") => setFormData({ ...formData, contact_method: value })}
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

      {isService && (
        <Card className="admin-card">
          <CardHeader>
            <CardTitle>Service Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="service_pricing_model">Pricing Model *</Label>
                <Select
                  value={formData.service_details?.pricing_model || ""}
                  onValueChange={(value: ServicePricingModel) =>
                    setFormData({
                      ...formData,
                      service_details: {
                        ...(formData.service_details || {}),
                        pricing_model: value,
                      },
                    })
                  }
                >
                  <SelectTrigger id="service_pricing_model">
                    <SelectValue placeholder="Select pricing model" />
                  </SelectTrigger>
                  <SelectContent>
                    {servicePricingModelOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="service_area">Service Area *</Label>
                <Input
                  id="service_area"
                  value={formData.service_details?.service_area || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      service_details: {
                        ...(formData.service_details || {}),
                        service_area: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g., Nairobi CBD, Online, All campuses"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_availability">Availability</Label>
              <Input
                id="service_availability"
                value={formData.service_details?.availability || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    service_details: {
                      ...(formData.service_details || {}),
                      availability: e.target.value,
                    },
                  })
                }
                placeholder="e.g., Mon-Fri 8AM-6PM"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {isHostel && (
        <Card className="admin-card">
          <CardHeader>
            <CardTitle>Hostel Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hostel_room_type">Room Type *</Label>
                <Select
                  value={formData.hostel_details?.room_type || ""}
                  onValueChange={(value: "single" | "shared" | "studio" | "bedsitter") =>
                    setFormData({
                      ...formData,
                      hostel_details: {
                        ...(formData.hostel_details || {}),
                        room_type: value,
                      },
                    })
                  }
                >
                  <SelectTrigger id="hostel_room_type">
                    <SelectValue placeholder="Select room type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single Room</SelectItem>
                    <SelectItem value="shared">Shared Room</SelectItem>
                    <SelectItem value="studio">Studio</SelectItem>
                    <SelectItem value="bedsitter">Bedsitter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hostel_beds_available">Beds Available *</Label>
                <Input
                  id="hostel_beds_available"
                  type="number"
                  min="1"
                  value={formData.hostel_details?.beds_available || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      hostel_details: {
                        ...(formData.hostel_details || {}),
                        beds_available: Number(e.target.value) || 0,
                      },
                    })
                  }
                  placeholder="e.g., 2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hostel_gender_policy">Gender Policy</Label>
                <Select
                  value={formData.hostel_details?.gender_policy || ""}
                  onValueChange={(value: "male" | "female" | "mixed") =>
                    setFormData({
                      ...formData,
                      hostel_details: {
                        ...(formData.hostel_details || {}),
                        gender_policy: value,
                      },
                    })
                  }
                >
                  <SelectTrigger id="hostel_gender_policy">
                    <SelectValue placeholder="Select policy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male Only</SelectItem>
                    <SelectItem value="female">Female Only</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Add Amenities</Label>
              <div className="flex gap-2">
                <Input
                  value={amenityInput}
                  onChange={(e) => setAmenityInput(e.target.value)}
                  placeholder="e.g., Wi-Fi, Laundry, Security"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addAmenity();
                    }
                  }}
                />
                <Button type="button" onClick={addAmenity} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(formData.hostel_details?.amenities || []).map((amenity, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {amenity}
                    <button
                      type="button"
                      onClick={() => removeAmenity(index)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Images */}
      <Card className="admin-card">
        <CardHeader>
          <CardTitle>{isProduct ? "Product Images" : "Listing Images"}</CardTitle>
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
            <Label htmlFor="is_negotiable">
              {isService ? "Rate is negotiable" : isHostel ? "Rent is negotiable" : "Price is negotiable"}
            </Label>
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
