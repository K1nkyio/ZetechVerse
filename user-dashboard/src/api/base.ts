// Base API configuration and utilities
const DEFAULT_API_BASE_URL = 'http://localhost:3000/api';

const ensureApiBasePath = (rawUrl: string) => {
  const trimmed = rawUrl.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const envApiBase = (import.meta.env.VITE_API_URL || '').trim();
const API_BASE_URL = ensureApiBasePath(envApiBase || DEFAULT_API_BASE_URL);

console.log('[API Client] Initialized with base URL:', API_BASE_URL);

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: any[];
}

export class ApiClient {
  private baseURL: string;
  private token: string | null = null;
  private cache = new Map<string, { expiresAt: number; response: ApiResponse<any> }>();
  private inFlight = new Map<string, Promise<ApiResponse<any>>>();

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    // Keep auth session-scoped so reopening the app requires login.
    this.token = sessionStorage.getItem('auth_token');
    localStorage.removeItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      sessionStorage.setItem('auth_token', token);
    } else {
      sessionStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    // Always check sessionStorage for the latest token
    const storedToken = sessionStorage.getItem('auth_token');
    if (storedToken) {
      this.token = storedToken;
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    // Add authorization header if token exists
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log('[API] Response Status:', response.status);

      const data: ApiResponse<T> = await response.json();

      console.log('[API] Response Data:', {
        success: data.success,
        message: data.message,
        hasData: !!data.data,
        dataType: Array.isArray(data.data) ? 'array' : typeof data.data,
        dataLength: Array.isArray(data.data) ? data.data.length : 'N/A',
        errors: data.errors,
        pagination: data.pagination
      });

      // Handle unauthorized responses (user dashboard allows anonymous access)
      if (response.status === 401) {
        this.setToken(null);
        // For user dashboard, don't redirect - let the component handle the error
        // since anonymous users don't need to login
      }

      if (!response.ok) {
        throw data;
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const defaultCacheTTL = 20_000;
    return this.getWithOptions<T>(endpoint, params, { cacheTTL: defaultCacheTTL });
  }

  async getWithOptions<T>(
    endpoint: string,
    params?: Record<string, any>,
    options?: { cacheTTL?: number; skipCache?: boolean }
  ): Promise<ApiResponse<T>> {
    // Filter out undefined values from params
    const cleanParams = params ? Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== undefined)
    ) : undefined;

    const url = cleanParams ? `${endpoint}?${new URLSearchParams(cleanParams)}` : endpoint;
    const cacheKey = `${this.baseURL}${url}`;
    const now = Date.now();
    const cacheTTL = options?.cacheTTL ?? 0;
    const useCache = !options?.skipCache && cacheTTL > 0;

    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        return cached.response as ApiResponse<T>;
      }
    }

    const existingRequest = this.inFlight.get(cacheKey);
    if (existingRequest) {
      return existingRequest as Promise<ApiResponse<T>>;
    }

    console.log('[API] GET request:', {
      endpoint,
      params,
      cleanParams,
      fullUrl: `${this.baseURL}${url}`
    });

    const requestPromise = this.request<T>(url);
    this.inFlight.set(cacheKey, requestPromise as Promise<ApiResponse<any>>);

    try {
      const result = await requestPromise;
      if (useCache) {
        this.cache.set(cacheKey, { response: result, expiresAt: now + cacheTTL });
      }
      return result;
    } finally {
      this.inFlight.delete(cacheKey);
    }
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    this.invalidateCache();
    return response;
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    this.invalidateCache();
    return response;
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await this.request<T>(endpoint, {
      method: 'DELETE',
    });
    this.invalidateCache();
    return response;
  }

  async prefetch(endpoint: string, params?: Record<string, any>, cacheTTL = 60_000): Promise<void> {
    try {
      await this.getWithOptions(endpoint, params, { cacheTTL, skipCache: false });
    } catch (error) {
      console.warn('[API] Prefetch failed:', endpoint, error);
    }
  }

  invalidateCache(match?: string): void {
    if (!match) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.includes(match)) {
        this.cache.delete(key);
      }
    }
  }
}

// Create and export a default API client instance
export const apiClient = new ApiClient();

// Helper function to handle API responses
export const handleApiResponse = <T>(response: ApiResponse<T>): T => {
  if (!response.success) {
    throw new Error(response.message || 'API request failed');
  }
  return response.data as T;
};

// Helper function to handle API errors
export const handleApiError = (error: any): string => {
  if (error?.message) {
    return error.message;
  }
  if (error?.errors && Array.isArray(error.errors)) {
    return error.errors.map((err: any) => err.message || err.msg).join(', ');
  }
  return 'An unexpected error occurred';
};
