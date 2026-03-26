import { useState, useEffect } from 'react';
import { authService, User } from '@/services/auth.service';

// Custom hook for authentication state
export function useAuth() {
  const [user, setUser] = useState<User | null>(authService.getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize auth state
    const currentUser = authService.getCurrentUser();
    const authStatus = authService.isAuthenticated();
    
    setUser(currentUser);
    setIsAuthenticated(authStatus);
    setLoading(false);

    // Listen for auth state changes
    const handleAuthChange = () => {
      const newUser = authService.getCurrentUser();
      const newAuthStatus = authService.isAuthenticated();
      
      setUser(newUser);
      setIsAuthenticated(newAuthStatus);
    };

    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('auth-changed', handleAuthChange as EventListener);
    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('auth-changed', handleAuthChange as EventListener);
    };
  }, []);

  const login = async (credentials: { identifier: string; password: string; remember_me?: boolean }) => {
    try {
      setLoading(true);
      const user = await authService.login(credentials);
      setUser(user);
      setIsAuthenticated(true);
      return user;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: { email: string; username: string; password: string; full_name?: string }) => {
    try {
      setLoading(true);
      const user = await authService.register(data);
      setUser(user);
      setIsAuthenticated(true);
      return user;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    try {
      setLoading(true);
      const user = await authService.getProfile();
      setUser(user);
      return user;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    refreshProfile,
    isAdmin: authService.isAdmin(),
    isSuperAdmin: authService.isSuperAdmin(),
    getUserRole: authService.getUserRole(),
    hasPermission: authService.hasPermission
  };
}

// Custom hook for role-based access
export function useRole() {
  const { user, isAuthenticated } = useAuth();
  
  return {
    isAuthenticated,
    user,
    role: user?.role,
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
    isSuperAdmin: user?.role === 'super_admin',
    isRegularUser: user?.role === 'user'
  };
}

// Custom hook for permissions
export function usePermissions() {
  const { user } = useAuth();
  
  const hasPermission = (permission: string) => {
    if (!user) return false;
    return authService.hasPermission(permission);
  };

  const permissions = {
    canReadOwnProfile: hasPermission('read_own_profile'),
    canWriteOwnPosts: hasPermission('write_own_posts'),
    canComment: hasPermission('comment'),
    canModerateContent: hasPermission('moderate_content'),
    canManageUsers: hasPermission('manage_users'),
    canManageSystem: hasPermission('manage_system')
  };

  return {
    hasPermission,
    ...permissions
  };
}

// Custom hook for OAuth
export function useOAuth() {
  const { login } = useAuth();
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    try {
      setOauthLoading(true);
      setOauthError(null);
      
      const redirectUrl = await authService.oauthLogin(provider);
      window.location.href = redirectUrl;
    } catch (error: any) {
      setOauthError(error.message || 'OAuth login failed');
    } finally {
      setOauthLoading(false);
    }
  };

  const handleOAuthCallback = async (provider: 'google' | 'github', code: string, state?: string) => {
    try {
      setOauthLoading(true);
      setOauthError(null);
      
      const user = await authService.oauthCallback(provider, code, state);
      return user;
    } catch (error: any) {
      setOauthError(error.message || 'OAuth callback failed');
      throw error;
    } finally {
      setOauthLoading(false);
    }
  };

  return {
    oauthLoading,
    oauthError,
    handleOAuthLogin,
    handleOAuthCallback
  };
}

// Custom hook for password management
export function usePassword() {
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      setPasswordLoading(true);
      setPasswordError(null);
      setPasswordSuccess(null);
      
      await authService.changePassword(currentPassword, newPassword);
      setPasswordSuccess('Password changed successfully');
    } catch (error: any) {
      setPasswordError(error.message || 'Failed to change password');
      throw error;
    } finally {
      setPasswordLoading(false);
    }
  };

  const forgotPassword = async (email: string): Promise<{ resetLink?: string }> => {
    try {
      setPasswordLoading(true);
      setPasswordError(null);
      setPasswordSuccess(null);
      
      const result = await authService.forgotPassword(email);
      setPasswordSuccess('Password reset email sent. Please check your inbox.');
      return result;
    } catch (error: any) {
      setPasswordError(error.message || 'Failed to send reset email');
      throw error;
    } finally {
      setPasswordLoading(false);
    }
  };

  const resetPassword = async (token: string, password: string) => {
    try {
      setPasswordLoading(true);
      setPasswordError(null);
      setPasswordSuccess(null);
      
      await authService.resetPassword(token, password);
      setPasswordSuccess('Password reset successfully');
    } catch (error: any) {
      setPasswordError(error.message || 'Failed to reset password');
      throw error;
    } finally {
      setPasswordLoading(false);
    }
  };

  return {
    passwordLoading,
    passwordError,
    passwordSuccess,
    changePassword,
    forgotPassword,
    resetPassword
  };
}
