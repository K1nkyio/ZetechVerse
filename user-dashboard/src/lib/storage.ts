const isBrowser = typeof window !== 'undefined';

export const getStored = <T>(key: string, fallback: T): T => {
  if (!isBrowser) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const setStored = <T>(key: string, value: T): void => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota/privacy errors.
  }
};

export const removeStored = (key: string): void => {
  if (!isBrowser) return;
  window.localStorage.removeItem(key);
};

export const upsertRecent = (
  key: string,
  value: string,
  maxItems = 8
): string[] => {
  const trimmed = value.trim();
  if (!trimmed) return getStored<string[]>(key, []);

  const current = getStored<string[]>(key, []);
  const deduped = [trimmed, ...current.filter((item) => item !== trimmed)];
  const next = deduped.slice(0, maxItems);
  setStored(key, next);
  return next;
};
