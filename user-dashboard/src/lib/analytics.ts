type EventPayload = Record<string, unknown>;

type TrackedEvent = {
  name: string;
  payload?: EventPayload;
  timestamp: string;
};

const STORAGE_KEY = 'zv:analytics:queue';
const EXPERIMENT_KEY = 'zv:experiments';
const MAX_QUEUE_SIZE = 200;
const DEFAULT_API_BASE_URL = 'http://localhost:3000/api';

const ensureApiBasePath = (rawUrl: string) => {
  const trimmed = rawUrl.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const envApiBase = (import.meta.env.VITE_API_URL || '').trim();
const apiBase = ensureApiBasePath(envApiBase || DEFAULT_API_BASE_URL);
const ANALYTICS_ENDPOINT = `${apiBase}/analytics/events`;
const shouldSendAnalytics = import.meta.env.PROD && !!envApiBase;

const isBrowser = typeof window !== 'undefined';

const safeParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const readQueue = (): TrackedEvent[] => {
  if (!isBrowser) return [];
  return safeParse<TrackedEvent[]>(window.localStorage.getItem(STORAGE_KEY), []);
};

const writeQueue = (events: TrackedEvent[]) => {
  if (!isBrowser) return;
  const trimmed = events.slice(-MAX_QUEUE_SIZE);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
};

export const trackEvent = (name: string, payload?: EventPayload) => {
  const event: TrackedEvent = {
    name,
    payload,
    timestamp: new Date().toISOString(),
  };

  const queue = readQueue();
  queue.push(event);
  writeQueue(queue);

  // Best-effort fire-and-forget delivery for environments with this endpoint.
  // Keep dev/local free of noisy blocked-network errors.
  if (!shouldSendAnalytics) return;
  if (!isBrowser) return;
  const body = JSON.stringify(event);
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(ANALYTICS_ENDPOINT, blob);
  } else {
    fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined);
  }
};

export const trackPageView = (path: string) => {
  trackEvent('page_view', { path });
};

export const getEventQueue = () => readQueue();

export const getExperimentVariant = <T extends string>(
  experiment: string,
  variants: T[]
): T => {
  if (!variants.length) {
    throw new Error('variants must not be empty');
  }

  if (!isBrowser) return variants[0];

  const store = safeParse<Record<string, T>>(
    window.localStorage.getItem(EXPERIMENT_KEY),
    {}
  );

  if (!store[experiment]) {
    const selected = variants[Math.floor(Math.random() * variants.length)];
    store[experiment] = selected;
    window.localStorage.setItem(EXPERIMENT_KEY, JSON.stringify(store));
  }

  return store[experiment];
};
