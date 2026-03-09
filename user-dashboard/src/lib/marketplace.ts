const parseObjectish = (value: unknown): Record<string, any> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, any>;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return {};
  }

  let current = value;
  for (let i = 0; i < 2; i += 1) {
    try {
      const parsed = JSON.parse(current);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, any>;
      }
      if (typeof parsed === 'string') {
        current = parsed;
        continue;
      }
      return {};
    } catch {
      return {};
    }
  }

  return {};
};

const asTrimmedString = (value: unknown) => {
  return typeof value === 'string' ? value.trim() : '';
};

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const getFirstValueByKeys = (source: Record<string, any>, keys: string[]) => {
  const normalizedEntries = new Map<string, unknown>();

  for (const [key, value] of Object.entries(source)) {
    normalizedEntries.set(normalizeKey(key), value);
  }

  for (const key of keys) {
    const hit = normalizedEntries.get(normalizeKey(key));
    if (hit !== undefined && hit !== null && hit !== '') {
      return hit;
    }
  }

  return undefined;
};

const mergeDetailSources = (value: unknown, nestedKeys: string[]) => {
  const root = parseObjectish(value);
  const merged: Record<string, any> = { ...root };

  const details = parseObjectish(root.details);
  if (Object.keys(details).length > 0) {
    Object.assign(merged, details);
  }

  for (const key of nestedKeys) {
    const nested = parseObjectish(root[key]);
    if (Object.keys(nested).length > 0) {
      Object.assign(merged, nested);
    }
  }

  return merged;
};

const normalizeAmenities = (value: unknown) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => asTrimmedString(item))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[,\n;|]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

export const normalizeServiceDetails = (value: unknown) => {
  const source = mergeDetailSources(value, [
    'service_details',
    'serviceDetails',
    'service_setup',
    'serviceSetup',
    'service',
    'serviceInfo'
  ]);

  const pricingModel = asTrimmedString(getFirstValueByKeys(source, [
    'pricing_model',
    'pricingModel',
    'pricing',
    'pricing_type',
    'pricingType',
    'rate_model',
    'rateModel',
    'pricing model'
  ]));

  const serviceArea = asTrimmedString(getFirstValueByKeys(source, [
    'service_area',
    'serviceArea',
    'area',
    'coverage_area',
    'coverageArea',
    'service area'
  ]));

  const availability = asTrimmedString(getFirstValueByKeys(source, [
    'availability',
    'service_availability',
    'serviceAvailability',
    'schedule'
  ]));

  return {
    pricing_model: pricingModel,
    service_area: serviceArea,
    availability: availability,
  };
};

export const normalizeHostelDetails = (value: unknown) => {
  const source = mergeDetailSources(value, [
    'hostel_details',
    'hostelDetails',
    'hostel_setup',
    'hostelSetup',
    'accommodation_setup',
    'accommodationSetup',
    'accomodation_setup',
    'accomodationSetup',
    'accommodation',
    'accomodation'
  ]);

  const roomType = asTrimmedString(getFirstValueByKeys(source, [
    'room_type',
    'roomType',
    'type_of_room',
    'typeOfRoom',
    'room',
    'room type'
  ]));

  const bedsAvailableRaw = getFirstValueByKeys(source, [
    'beds_available',
    'bedsAvailable',
    'beds',
    'bed_count',
    'bedCount',
    'beds available'
  ]);
  const numericBeds = Number(bedsAvailableRaw);
  const bedsAvailable = Number.isFinite(numericBeds) && numericBeds > 0 ? numericBeds : undefined;

  const genderPolicy = asTrimmedString(getFirstValueByKeys(source, [
    'gender_policy',
    'genderPolicy',
    'gender',
    'policy',
    'gender policy'
  ]));

  const amenities = normalizeAmenities(getFirstValueByKeys(source, [
    'amenities',
    'facilities',
    'facility'
  ]));

  return {
    room_type: roomType,
    beds_available: bedsAvailable,
    gender_policy: genderPolicy,
    amenities: amenities,
  };
};

export const getEffectiveListingKind = (listing: any): 'product' | 'service' | 'hostel' => {
  const rawKind = String(listing?.listing_kind || '').toLowerCase();
  if (rawKind === 'service' || rawKind === 'hostel') {
    return rawKind;
  }

  const serviceDetails = normalizeServiceDetails(listing);
  const hostelDetails = normalizeHostelDetails(listing);
  const hasServiceDetails = Boolean(
    serviceDetails.pricing_model ||
    serviceDetails.service_area ||
    serviceDetails.availability
  );
  const hasHostelDetails = Boolean(
    hostelDetails.room_type ||
    Number(hostelDetails.beds_available || 0) > 0 ||
    hostelDetails.gender_policy ||
    hostelDetails.amenities.length > 0
  );

  if (hasHostelDetails) return 'hostel';
  if (hasServiceDetails) return 'service';

  const categoryText = `${listing?.category_name || ''} ${listing?.category_slug || ''}`.toLowerCase();
  if (categoryText.includes('hostel')) return 'hostel';
  if (categoryText.includes('service')) return 'service';

  return 'product';
};
