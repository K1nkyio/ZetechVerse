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

debugLog('[API Client] Initialized with base URL:', API_BASE_URL);

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

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    // Keep auth session-scoped so reopening requires login.
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
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

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

      debugLog('[API] Response Status:', response.status);

      const data: ApiResponse<T> = await response.json();

      debugLog('[API] Response Data:', {
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
    // Filter out undefined values from params
    const cleanParams = params ? Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== undefined)
    ) : undefined;
    
    const url = cleanParams ? `${endpoint}?${new URLSearchParams(cleanParams)}` : endpoint;
    debugLog('[API] GET request:', {
      endpoint,
      params,
      cleanParams,
      fullUrl: `${this.baseURL}${url}`
    });
    return this.request<T>(url);
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
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
