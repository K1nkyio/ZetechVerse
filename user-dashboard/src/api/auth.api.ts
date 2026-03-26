import { apiClient, handleApiResponse, ApiResponse } from './base';

// Types
export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  student_id?: string;
  course?: string;
  year_of_study?: number;
  phone?: string;
  role: 'user' | 'admin' | 'super_admin';
  avatar_url?: string;
  bio?: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface LoginCredentials {
  identifier: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  full_name?: string;
  student_id?: string;
  course?: string;
  year_of_study?: number;
  phone?: string;
}

export interface UpdateProfileData {
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  phone?: string;
  course?: string;
  year_of_study?: number;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Auth service class
export class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;

  private constructor() {
    // Enforce session-scoped auth for dashboard access.
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');

    // Try to restore user from sessionStorage
    const token = apiClient.getToken();
    if (token) {
      // You might want to validate token here
      const userData = sessionStorage.getItem('user_data');
      if (userData) {
        try {
          this.currentUser = JSON.parse(userData);
        } catch (error) {
          console.error('Failed to parse user data from sessionStorage:', error);
          this.logout();
        }
      }
    }
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Authentication methods
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    const result = handleApiResponse(response);

    // Save auth data
    this.setAuthData(result.user, result.token);
    return result;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    const result = handleApiResponse(response);

    // Save auth data
    this.setAuthData(result.user, result.token);
    return result;
  }

  async logout(): Promise<void> {
    this.currentUser = null;
    apiClient.setToken(null);
    sessionStorage.removeItem('user_data');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  }

  async getProfile(): Promise<User> {
    const response = await apiClient.get<User>('/auth/profile');
    const user = handleApiResponse(response);
    this.currentUser = user;
    sessionStorage.setItem('user_data', JSON.stringify(user));
    return user;
  }

  async updateProfile(data: UpdateProfileData): Promise<User> {
    const response = await apiClient.put<User>('/auth/profile', data);
    const user = handleApiResponse(response);
    this.currentUser = user;
    sessionStorage.setItem('user_data', JSON.stringify(user));
    return user;
  }

  async changePassword(data: ChangePasswordData): Promise<void> {
    const response = await apiClient.put('/auth/change-password', data);
    handleApiResponse(response);
  }

  async forgotPassword(data: ForgotPasswordData): Promise<void> {
    const response = await apiClient.post('/auth/forgot-password', data);
    handleApiResponse(response);
  }

  async resetPassword(data: ResetPasswordData): Promise<void> {
    const response = await apiClient.post('/auth/reset-password', data);
    handleApiResponse(response);
  }

  async oauthLogin(provider: 'google' | 'github'): Promise<{ redirectUrl: string }> {
    const response = await apiClient.get<{ redirectUrl: string }>(`/auth/oauth/${provider}`);
    return handleApiResponse(response);
  }

  async oauthCallback(provider: 'google' | 'github', code: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(`/auth/oauth/${provider}/callback`, { code });
    const result = handleApiResponse(response);
    
    // Save auth data
    this.setAuthData(result.user, result.token);
    return result;
  }

  async verifyToken(): Promise<{ user: User }> {
    const response = await apiClient.get<{ user: User }>('/auth/verify');
    return handleApiResponse(response);
  }

  // Helper methods
  private setAuthData(user: User, token: string): void {
    this.currentUser = user;
    apiClient.setToken(token);
    sessionStorage.setItem('user_data', JSON.stringify(user));
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return !!this.currentUser && !!apiClient.getToken();
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'admin' || this.currentUser?.role === 'super_admin';
  }

  isSuperAdmin(): boolean {
    return this.currentUser?.role === 'super_admin';
  }

  getToken(): string | null {
    return apiClient.getToken();
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();

// Export individual functions for convenience
export const authApi = {
  register: (data: RegisterData) => authService.register(data),
  login: (credentials: LoginCredentials) => authService.login(credentials),
  logout: () => authService.logout(),
  getProfile: () => authService.getProfile(),
  updateProfile: (data: UpdateProfileData) => authService.updateProfile(data),
  changePassword: (data: ChangePasswordData) => authService.changePassword(data),
  forgotPassword: (data: ForgotPasswordData) => authService.forgotPassword(data),
  resetPassword: (data: ResetPasswordData) => authService.resetPassword(data),
  oauthLogin: (provider: 'google' | 'github') => authService.oauthLogin(provider),
  oauthCallback: (provider: 'google' | 'github', code: string) => authService.oauthCallback(provider, code),
  verifyToken: () => authService.verifyToken(),
  getCurrentUser: () => authService.getCurrentUser(),
  isAuthenticated: () => authService.isAuthenticated(),
  isAdmin: () => authService.isAdmin(),
  isSuperAdmin: () => authService.isSuperAdmin(),
};
