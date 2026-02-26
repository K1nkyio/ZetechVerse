// Base API configuration and utilities
const DEFAULT_API_BASE_URL = 'http://localhost:3000/api';

const ensureApiBasePath = (rawUrl: string) => {
  const trimmed = rawUrl.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const envApiBase = (import.meta.env.VITE_API_URL || '').trim();
const API_BASE_URL = ensureApiBasePath(envApiBase || DEFAULT_API_BASE_URL);
const IS_DEV = import.meta.env.DEV;

const debugLog = (...args: unknown[]) => {
  if (IS_DEV) {
    console.log(...args);
  }
};

debugLog('API Client initialized with base URL:', API_BASE_URL);

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

export interface ApiClientResponse<T = any> {
  status: number;
  data: ApiResponse<T>;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: any[];
}

export class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    // Keep auth session-scoped so reopening the dashboard requires login.
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
    const storedToken = sessionStorage.getItem('auth_token');
    if (storedToken) {
      this.token = storedToken;
      return storedToken;
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiClientResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // Add authorization header if token exists
    const token = this.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    debugLog('API Request:', {
      method: options.method || 'GET',
      url,
      hasToken: !!token,
      hasBody: !!options.body,
    });

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      debugLog('API Response Status:', response.status);

      const data: ApiResponse<T> = await response.json();

      debugLog('API Response Data:', {
        success: data.success,
        message: data.message,
        hasData: !!data.data,
        errors: data.errors,
      });

      // Handle unauthorized responses
      if (response.status === 401) {
        debugLog('API: Unauthorized (401), clearing token');
        this.setToken(null);
      }

      if (!response.ok) {
        console.error('API Error Response:', data);
        const apiError: any = new Error(data.message || 'API request failed');
        apiError.status = response.status;
        apiError.data = data;
        apiError.errors = data.errors;
        throw apiError;
      }

      // Return response object with status and data
      return {
        status: response.status,
        data: data
      };
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiClientResponse<T>> {
    // Filter out undefined values from params
    const cleanParams = params ? Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== undefined)
    ) : undefined;
    const url = cleanParams ? `${endpoint}?${new URLSearchParams(cleanParams)}` : endpoint;
    return this.request<T>(url);
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiClientResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiClientResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiClientResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

// Create and export a default API client instance
export const apiClient = new ApiClient();

// Helper function to handle API responses
export const handleApiResponse = <T>(response: ApiClientResponse<T>): T => {
  if (!response.data.success) {
    const error: any = new Error(response.data.message || 'API request failed');
    error.errors = response.data.errors;
    error.message = response.data.message;
    throw error;
  }
  return response.data.data as T;
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
