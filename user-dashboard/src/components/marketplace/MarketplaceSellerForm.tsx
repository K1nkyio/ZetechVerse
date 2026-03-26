import { useEffect, useRef, useState } from 'react';
import { marketplaceApi, type CreateMarketplaceListingData, type ListingKind, type MarketplaceCategory, type MarketplaceListing, type ServicePricingModel } from '@/api/marketplace.api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getEffectiveListingKind } from '@/lib/marketplace';
import { ImagePlus, Loader2, Plus, Save, X } from 'lucide-react';

const servicePricingModels: Array<{ value: ServicePricingModel; label: string }> = [
  { value: 'per_hour', label: 'Per hour' },
  { value: 'per_task_assignment', label: 'Per task / assignment' },
  { value: 'subscription_package', label: 'Subscription / package' },
  { value: 'pay_per_consultation_meeting', label: 'Consultation / meeting' },
  { value: 'tiered_pricing', label: 'Tiered pricing' },
  { value: 'one_time_flat_fee', label: 'One-time flat fee' },
  { value: 'group_bulk_rate', label: 'Group / bulk rate' },
  { value: 'retainer_monthly_contract', label: 'Retainer / monthly contract' },
];

interface MarketplaceSellerFormProps {
  initialData?: MarketplaceListing | null;
  onSubmit: (data: CreateMarketplaceListingData) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

type FormState = {
  title: string;
  description: string;
  price: number;
  category_id?: number;
  listing_kind: ListingKind;
  location: string;
  condition: 'new' | 'used' | 'refurbished';
  pricing_model?: ServicePricingModel;
  service_area: string;
  availability: string;
  room_type?: 'single' | 'shared' | 'studio' | 'bedsitter';
  beds_available?: number;
  gender_policy?: 'male' | 'female' | 'mixed';
  phone: string;
  image_urls: string[];
  tags: string[];
  contact_method: 'phone' | 'email' | 'in_app';
  is_negotiable: boolean;
  urgent: boolean;
  status: 'active' | 'sold' | 'inactive';
  expires_at: string;
};

const makeInitialState = (listing?: MarketplaceListing | null): FormState => ({
  title: listing?.title || '',
  description: listing?.description || '',
  price: listing?.price || 0,
  category_id: listing?.category_id,
  listing_kind: listing ? getEffectiveListingKind(listing) : 'product',
  location: listing?.location || '',
  condition: listing?.condition === 'new' || listing?.condition === 'refurbished' ? listing.condition : 'used',
  pricing_model: listing?.service_details?.pricing_model,
  service_area: listing?.service_details?.service_area || '',
  availability: listing?.service_details?.availability || '',
  room_type: listing?.hostel_details?.room_type,
  beds_available: listing?.hostel_details?.beds_available,
  gender_policy: listing?.hostel_details?.gender_policy,
  phone: listing?.phone || '',
  image_urls: Array.isArray(listing?.image_urls) ? listing.image_urls : [],
  tags: Array.isArray(listing?.tags) ? listing.tags : [],
  contact_method: listing?.contact_method || 'in_app',
  is_negotiable: listing?.is_negotiable ?? false,
  urgent: listing?.urgent ?? false,
  status: listing?.status === 'sold' || listing?.status === 'inactive' ? listing.status : 'active',
  expires_at: listing?.expires_at ? new Date(listing.expires_at).toISOString().split('T')[0] : '',
});

export function MarketplaceSellerForm({ initialData, onSubmit, onCancel, isSubmitting = false }: MarketplaceSellerFormProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [formData, setFormData] = useState<FormState>(() => makeInitialState(initialData));

  const isProduct = formData.listing_kind === 'product';
  const isService = formData.listing_kind === 'service';
  const isHostel = formData.listing_kind === 'hostel';

  useEffect(() => {
    setFormData(makeInitialState(initialData));
  }, [initialData]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setCategoriesLoading(true);
        const data = await marketplaceApi.getCategories();
        if (mounted) setCategories(Array.isArray(data) ? data : []);
      } catch {
        if (mounted) {
          toast({ title: 'Could not load categories', description: 'Refresh and try again.', variant: 'destructive' });
        }
      } finally {
        if (mounted) setCategoriesLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [toast]);

  const addImageUrl = () => {
    const nextUrl = imageUrlInput.trim();
    if (!nextUrl) return;
    setFormData((current) => ({ ...current, image_urls: [...current.image_urls, nextUrl] }));
    setImageUrlInput('');
  };

  const addTag = () => {
    const nextTag = tagInput.trim();
    if (!nextTag || formData.tags.includes(nextTag)) return;
    setFormData((current) => ({ ...current, tags: [...current.tags, nextTag] }));
    setTagInput('');
  };

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = typeof event.target?.result === 'string' ? event.target.result : '';
        if (!result) return;
        setFormData((current) => ({ ...current, image_urls: [...current.image_urls, result] }));
      };
      reader.readAsDataURL(file);
    });
  };

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (formData.title.trim().length < 5) {
      toast({ title: 'Title is too short', description: 'Use at least 5 characters.', variant: 'destructive' });
      return;
    }
    if (formData.description.trim().length < 10) {
      toast({ title: 'Description is too short', description: 'Use at least 10 characters.', variant: 'destructive' });
      return;
    }
    if (!formData.price || formData.price <= 0 || !formData.category_id) {
      toast({ title: 'Missing core details', description: 'Set a valid price and category.', variant: 'destructive' });
      return;
    }
    if (isService && (!formData.pricing_model || !formData.service_area.trim())) {
      toast({ title: 'Service details missing', description: 'Add pricing model and service area.', variant: 'destructive' });
      return;
    }
    if (isHostel && (!formData.room_type || Number(formData.beds_available || 0) < 1)) {
      toast({ title: 'Hostel details missing', description: 'Add room type and available beds.', variant: 'destructive' });
      return;
    }

    const payload: CreateMarketplaceListingData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      price: Number(formData.price),
      category_id: Number(formData.category_id),
      listing_kind: formData.listing_kind,
      location: formData.location.trim() || undefined,
      condition: isProduct ? formData.condition : undefined,
      phone: formData.phone.trim() || undefined,
      image_urls: formData.image_urls.filter(Boolean),
      tags: formData.tags.filter(Boolean),
      contact_method: formData.contact_method,
      is_negotiable: formData.is_negotiable,
      urgent: formData.urgent,
      status: formData.status,
      expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : undefined,
      service_details: isService ? {
        pricing_model: formData.pricing_model,
        service_area: formData.service_area.trim(),
        availability: formData.availability.trim(),
      } : undefined,
      hostel_details: isHostel ? {
        room_type: formData.room_type,
        beds_available: Number(formData.beds_available || 0),
        gender_policy: formData.gender_policy,
      } : undefined,
    };

    await onSubmit(payload);
  };

  return (
    <form onSubmit={submitForm} className="space-y-5 pb-8">
      <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="seller-title">Title</Label>
            <Input id="seller-title" value={formData.title} onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="seller-description">Description</Label>
            <Textarea id="seller-description" rows={5} value={formData.description} onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seller-price">Price (KES)</Label>
            <Input id="seller-price" type="number" min="0" step="0.01" value={formData.price || ''} onChange={(event) => setFormData((current) => ({ ...current, price: Number(event.target.value) || 0 }))} />
          </div>
          <div className="space-y-2">
            <Label>Listing type</Label>
            <Select value={formData.listing_kind} onValueChange={(value: ListingKind) => setFormData((current) => ({ ...current, listing_kind: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="product">Product</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="hostel">Hostel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={formData.category_id ? String(formData.category_id) : ''} onValueChange={(value) => setFormData((current) => ({ ...current, category_id: Number(value) }))}>
              <SelectTrigger><SelectValue placeholder={categoriesLoading ? 'Loading categories...' : 'Select category'} /></SelectTrigger>
              <SelectContent>{categories.map((category) => <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="seller-location">Location</Label>
            <Input id="seller-location" value={formData.location} onChange={(event) => setFormData((current) => ({ ...current, location: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seller-phone">Phone / WhatsApp</Label>
            <Input id="seller-phone" value={formData.phone} onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Contact method</Label>
            <Select value={formData.contact_method} onValueChange={(value: 'phone' | 'email' | 'in_app') => setFormData((current) => ({ ...current, contact_method: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in_app">In-app message</SelectItem>
                <SelectItem value="phone">Phone / WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isProduct && (
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select value={formData.condition} onValueChange={(value: 'new' | 'used' | 'refurbished') => setFormData((current) => ({ ...current, condition: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="used">Used</SelectItem>
                  <SelectItem value="refurbished">Refurbished</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </section>

      {(isService || isHostel) && (
        <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            {isService && (
              <>
                <div className="space-y-2">
                  <Label>Pricing model</Label>
                  <Select value={formData.pricing_model || ''} onValueChange={(value: ServicePricingModel) => setFormData((current) => ({ ...current, pricing_model: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select pricing model" /></SelectTrigger>
                    <SelectContent>{servicePricingModels.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-area">Service area</Label>
                  <Input id="service-area" value={formData.service_area} onChange={(event) => setFormData((current) => ({ ...current, service_area: event.target.value }))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="service-availability">Availability</Label>
                  <Input id="service-availability" value={formData.availability} onChange={(event) => setFormData((current) => ({ ...current, availability: event.target.value }))} />
                </div>
              </>
            )}
            {isHostel && (
              <>
                <div className="space-y-2">
                  <Label>Room type</Label>
                  <Select value={formData.room_type || ''} onValueChange={(value: 'single' | 'shared' | 'studio' | 'bedsitter') => setFormData((current) => ({ ...current, room_type: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select room type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="shared">Shared</SelectItem>
                      <SelectItem value="studio">Studio</SelectItem>
                      <SelectItem value="bedsitter">Bedsitter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="beds-available">Beds available</Label>
                  <Input id="beds-available" type="number" min="1" value={formData.beds_available || ''} onChange={(event) => setFormData((current) => ({ ...current, beds_available: Number(event.target.value) || 0 }))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Gender policy</Label>
                  <Select value={formData.gender_policy || ''} onValueChange={(value: 'male' | 'female' | 'mixed') => setFormData((current) => ({ ...current, gender_policy: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select policy" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male only</SelectItem>
                      <SelectItem value="female">Female only</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm space-y-4">
        <div className="space-y-2">
          <Label>Add image URL</Label>
          <div className="flex gap-2">
            <Input value={imageUrlInput} onChange={(event) => setImageUrlInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addImageUrl(); } }} placeholder="https://..." />
            <Button type="button" variant="outline" onClick={addImageUrl}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="rounded-2xl border border-dashed border-border p-4">
          <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(event) => handleFiles(event.target.files)} />
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <ImagePlus className="mr-2 h-4 w-4" />
            Upload photos
          </Button>
        </div>
        {formData.image_urls.length > 0 && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {formData.image_urls.map((imageUrl, index) => (
              <div key={`${imageUrl}-${index}`} className="relative overflow-hidden rounded-2xl border border-border">
                <img src={imageUrl} alt={`Listing ${index + 1}`} className="h-28 w-full object-cover" />
                <button type="button" className="absolute right-2 top-2 rounded-full bg-background/95 p-1" onClick={() => setFormData((current) => ({ ...current, image_urls: current.image_urls.filter((_, imageIndex) => imageIndex !== index) }))}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex gap-2">
            <Input value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addTag(); } }} placeholder="textbook, electronics, design..." />
            <Button type="button" variant="outline" onClick={addTag}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag, index) => (
              <Badge key={`${tag}-${index}`} variant="secondary" className="gap-1">
                #{tag}
                <button type="button" onClick={() => setFormData((current) => ({ ...current, tags: current.tags.filter((_, tagIndex) => tagIndex !== index) }))}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(value: 'active' | 'sold' | 'inactive') => setFormData((current) => ({ ...current, status: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiry-date">Expiry date</Label>
            <Input id="expiry-date" type="date" value={formData.expires_at} onChange={(event) => setFormData((current) => ({ ...current, expires_at: event.target.value }))} />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
          <div>
            <p className="font-medium">Negotiable</p>
            <p className="text-sm text-muted-foreground">Let buyers know the price can be discussed.</p>
          </div>
          <Switch checked={formData.is_negotiable} onCheckedChange={(checked) => setFormData((current) => ({ ...current, is_negotiable: checked }))} />
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
          <div>
            <p className="font-medium">Urgent</p>
            <p className="text-sm text-muted-foreground">Push the listing as time-sensitive.</p>
          </div>
          <Switch checked={formData.urgent} onCheckedChange={(checked) => setFormData((current) => ({ ...current, urgent: checked }))} />
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {initialData?.id ? 'Update listing' : 'Publish listing'}
        </Button>
      </div>
    </form>
  );
}
