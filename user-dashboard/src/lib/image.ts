import type { SyntheticEvent } from 'react';

const PLACEHOLDER_IMAGE = '/placeholder.svg';

const BLOCKED_IMAGE_HOSTS = new Set([
  'abufulanstore.co.ke',
  'www.abufulanstore.co.ke',
  'saruk.co.ke',
  'www.saruk.co.ke'
]);

const decodeNextImageUrl = (url: URL): string | null => {
  if (!url.pathname.startsWith('/_next/image')) {
    return null;
  }

  const encoded = url.searchParams.get('url');
  if (!encoded) {
    return null;
  }

  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
};

export const normalizeImageUrl = (rawUrl?: string | null): string => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return PLACEHOLDER_IMAGE;
  }

  const value = rawUrl.trim();
  if (!value) {
    return PLACEHOLDER_IMAGE;
  }

  if (value.startsWith('/') || value.startsWith('data:') || value.startsWith('blob:')) {
    return value;
  }

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();

    const unwrapped = decodeNextImageUrl(parsed);
    if (unwrapped) {
      return normalizeImageUrl(unwrapped);
    }

    if (BLOCKED_IMAGE_HOSTS.has(host)) {
      return PLACEHOLDER_IMAGE;
    }

    return parsed.toString();
  } catch {
    return value;
  }
};

export const applyImageFallback = (event: SyntheticEvent<HTMLImageElement>): void => {
  const element = event.currentTarget;
  if (element.dataset.fallbackApplied === 'true') {
    return;
  }

  element.dataset.fallbackApplied = 'true';
  element.src = PLACEHOLDER_IMAGE;
};

export const normalizeVideoUrl = (rawUrl?: string | null): string | null => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  const value = rawUrl.trim();
  if (!value) return null;
  if (value.startsWith('/') || value.startsWith('blob:') || value.startsWith('data:')) return value;

  try {
    return new URL(value).toString();
  } catch {
    return value;
  }
};
