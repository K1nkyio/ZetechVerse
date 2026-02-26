import { apiClient } from '@/api/base';
import { jwtDecode } from 'jwt-decode';

// Types
export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  role: 'user' | 'admin' | 'super_admin';
  avatar_url?: string;
  bio?: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

export interface OAuthProvider {
  name: 'google' | 'github';
  client_id: string;
  redirect_uri: string;
}

// JWT Payload interface
interface JwtPayload {
  exp: number;
  iat: number;
  user_id: string;
  role: string;
}

class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;
  private tokens: AuthTokens | null = null;
  private refreshTimeout: NodeJS.Timeout | null = null;
  private isRefreshing = false;

  private notifyAuthChanged(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth-changed'));
    }
  }

  private constructor() {
    this.initializeAuthState();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Initialize authentication state from storage
  private initializeAuthState(): void {
    try {
      // Remove legacy persistent auth so dashboard access always requires a fresh login after close.
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');

      const storedToken = sessionStorage.getItem('auth_token');
      const storedUser = sessionStorage.getItem('user_data');
      
      if (storedToken) {
        apiClient.setToken(storedToken);
        this.tokens = {
          access_token: storedToken,
          refresh_token: storedToken
        };
        
        if (storedUser) {
          this.currentUser = JSON.parse(storedUser);
        }
        
        // Check if token is expired
        if (this.isTokenExpired(storedToken)) {
          // For now, we'll just clear the state if token is expired
          // In a real implementation, you'd have refresh token logic
          this.clearAuthState();
        }
      }
    } catch (error) {
      console.error('Failed to initialize auth state:', error);
      this.clearAuthState();
    }
  }

  // Check if token is expired
  private isTokenExpired(token: string): boolean {
    try {
      const decoded: JwtPayload = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  // Schedule automatic token refresh
  private scheduleTokenRefresh(): void {
    if (this.tokens?.access_token) {
      try {
        const decoded: JwtPayload = jwtDecode(this.tokens.access_token);
        const currentTime = Date.now() / 1000;
        const timeUntilExpiry = (decoded.exp - currentTime - 300) * 1000; // Refresh 5 minutes before expiry
        
        if (timeUntilExpiry > 0) {
          this.refreshTimeout = setTimeout(() => {
            this.refreshToken();
          }, timeUntilExpiry);
        } else {
          this.refreshToken();
        }
      } catch (error) {
        console.error('Failed to schedule token refresh:', error);
      }
    }
  }

  // Refresh access token
  private async refreshToken(): Promise<void> {
    if (this.isRefreshing || !this.tokens?.refresh_token) return;
    
    this.isRefreshing = true;
    
    try {
      const response = await apiClient.post<AuthTokens>('/auth/refresh', {
        refresh_token: this.tokens.refresh_token
      });
      
      if (response.success && response.data) {
        this.setToken(response.data.access_token);
        console.log('Token refreshed successfully');
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
      this.logout();
    } finally {
      this.isRefreshing = false;
    }
  }

  // Set token and update API client
  private setToken(token: string): void {
    apiClient.setToken(token);
    sessionStorage.setItem('auth_token', token);
    // For simplicity, we'll treat the single token as both access and refresh
    // In a real implementation, you'd have separate tokens
    this.tokens = {
      access_token: token,
      refresh_token: token
    };

    this.notifyAuthChanged();
  }

  // Clear authentication state
  private clearAuthState(): void {
    this.currentUser = null;
    this.tokens = null;
    apiClient.setToken(null);
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('user_data');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }

    this.notifyAuthChanged();
  }

  // Register new user
  async register(data: RegisterData): Promise<User> {
    try {
      const response = await apiClient.post<{ user: User; token: string }>('/auth/register', data);
      
      if (response.success && response.data) {
        const { user, token } = response.data;
        this.currentUser = user;
        this.setToken(token);
        sessionStorage.setItem('user_data', JSON.stringify(user));
        return user;
      }
      
      throw new Error(response.message || 'Registration failed');
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // Login user
  async login(credentials: LoginCredentials): Promise<User> {
    try {
      const response = await apiClient.post<{ user: User; token: string }>('/auth/login', {
        email: credentials.email,
        password: credentials.password,
        remember_me: credentials.remember_me
      });
      
      if (response.success && response.data) {
        const { user, token } = response.data;
        this.currentUser = user;
        this.setToken(token);
        sessionStorage.setItem('user_data', JSON.stringify(user));
        return user;
      }
      
      throw new Error(response.message || 'Login failed');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      if (this.tokens?.refresh_token) {
        await apiClient.post('/auth/logout', {
          refresh_token: this.tokens.refresh_token
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuthState();
    }
  }

  // Get current user profile
  async getProfile(): Promise<User> {
    try {
      const response = await apiClient.get<User>('/auth/profile');
      
      if (response.success && response.data) {
        this.currentUser = response.data;
        sessionStorage.setItem('user_data', JSON.stringify(response.data));
        return response.data;
      }
      
      throw new Error(response.message || 'Failed to fetch profile');
    } catch (error) {
      console.error('Profile fetch error:', error);
      throw error;
    }
  }

  // Update user profile
  async updateProfile(data: Partial<User>): Promise<User> {
    try {
      const response = await apiClient.put<User>('/auth/profile', data);
      
      if (response.success && response.data) {
        this.currentUser = response.data;
        sessionStorage.setItem('user_data', JSON.stringify(response.data));
        return response.data;
      }
      
      throw new Error(response.message || 'Failed to update profile');
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  }

  // Forgot password
  async forgotPassword(email: string): Promise<{ resetLink?: string }> {
    try {
      const response = await apiClient.post<{ reset_link?: string }>('/auth/forgot-password', { email });
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to send reset email');
      }

      return {
        resetLink: response.data?.reset_link
      };
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  }

  // Reset password
  async resetPassword(token: string, password: string): Promise<void> {
    try {
      const response = await apiClient.post('/auth/reset-password', { token, password });
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }

  // OAuth login
  async oauthLogin(provider: 'google' | 'github'): Promise<string> {
    try {
      const response = await apiClient.get<{ redirect_url?: string; redirectUrl?: string }>(`/auth/oauth/${provider}`);
      const redirectUrl = response.data?.redirect_url || response.data?.redirectUrl;

      if (response.success && redirectUrl) {
        return redirectUrl;
      }
      
      throw new Error(response.message || 'OAuth login failed');
    } catch (error: any) {
      console.error('OAuth login error:', error);
      // Return a friendly message for missing OAuth endpoints
      if (error.message?.includes('API endpoint not found')) {
        throw new Error(`${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth is not configured yet. Please use email/password login.`);
      }
      throw error;
    }
  }

  // OAuth callback
  async oauthCallback(provider: 'google' | 'github', code: string, state?: string): Promise<User> {
    try {
      const response = await apiClient.post<{ user: User; token: string }>(`/auth/oauth/${provider}/callback`, { code, state });
      
      if (response.success && response.data) {
        const { user, token } = response.data;
        this.currentUser = user;
        this.setToken(token);
        sessionStorage.setItem('user_data', JSON.stringify(user));
        return user;
      }
      
      throw new Error(response.message || 'OAuth callback failed');
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw error;
    }
  }

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const response = await apiClient.put('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  // Verify email
  async verifyEmail(token: string): Promise<void> {
    try {
      const response = await apiClient.post('/auth/verify-email', { token });
      
      if (!response.success) {
        throw new Error(response.message || 'Email verification failed');
      }
      
      // Update user data if verification was successful
      if (this.currentUser) {
        this.currentUser.email_verified = true;
        sessionStorage.setItem('user_data', JSON.stringify(this.currentUser));
      }
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }

  // Resend verification email
  async resendVerificationEmail(): Promise<void> {
    try {
      const response = await apiClient.post('/auth/resend-verification');
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to resend verification email');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      throw error;
    }
  }

  // Getters
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return !!this.currentUser && !!this.tokens?.access_token && !this.isTokenExpired(this.tokens.access_token);
  }

  getUserRole(): 'user' | 'admin' | 'super_admin' | null {
    return this.currentUser?.role || null;
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'admin' || this.currentUser?.role === 'super_admin';
  }

  isSuperAdmin(): boolean {
    return this.currentUser?.role === 'super_admin';
  }

  getTokens(): AuthTokens | null {
    return this.tokens;
  }

  // Check if user has specific permission
  hasPermission(permission: string): boolean {
    if (!this.currentUser) return false;
    
    const permissions: Record<string, string[]> = {
      'user': ['read_own_profile', 'write_own_posts', 'comment'],
      'admin': ['read_own_profile', 'write_own_posts', 'comment', 'moderate_content', 'manage_users'],
      'super_admin': ['read_own_profile', 'write_own_posts', 'comment', 'moderate_content', 'manage_users', 'manage_system']
    };
    
    return permissions[this.currentUser.role]?.includes(permission) || false;
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
  updateProfile: (data: Partial<User>) => authService.updateProfile(data),
  forgotPassword: (email: string) => authService.forgotPassword(email),
  resetPassword: (token: string, password: string) => authService.resetPassword(token, password),
  oauthLogin: (provider: 'google' | 'github') => authService.oauthLogin(provider),
  oauthCallback: (provider: 'google' | 'github', code: string, state?: string) => authService.oauthCallback(provider, code, state),
  changePassword: (currentPassword: string, newPassword: string) => authService.changePassword(currentPassword, newPassword),
  verifyEmail: (token: string) => authService.verifyEmail(token),
  resendVerificationEmail: () => authService.resendVerificationEmail(),
  getCurrentUser: () => authService.getCurrentUser(),
  isAuthenticated: () => authService.isAuthenticated(),
  getUserRole: () => authService.getUserRole(),
  isAdmin: () => authService.isAdmin(),
  isSuperAdmin: () => authService.isSuperAdmin(),
  hasPermission: (permission: string) => authService.hasPermission(permission)
};
