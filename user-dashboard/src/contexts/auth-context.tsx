import { createContext, useContext, ReactNode } from 'react';
import { useAuth, useRole, usePermissions, useOAuth, usePassword } from '@/hooks/use-auth';
import { User } from '@/services/auth.service';

// Define the context type
interface AuthContextType {
  // Authentication state
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  
  // Role-based access
  role: 'user' | 'admin' | 'super_admin' | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isRegularUser: boolean;
  
  // Permissions
  hasPermission: (permission: string) => boolean;
  permissions: {
    canReadOwnProfile: boolean;
    canWriteOwnPosts: boolean;
    canComment: boolean;
    canModerateContent: boolean;
    canManageUsers: boolean;
    canManageSystem: boolean;
  };
  
  // Authentication methods
  login: (credentials: { identifier: string; password: string; remember_me?: boolean }) => Promise<User>;
  register: (data: { email: string; username: string; password: string; full_name?: string }) => Promise<User>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<User>;
  
  // OAuth methods
  oauthLoading: boolean;
  oauthError: string | null;
  handleOAuthLogin: (provider: 'google' | 'github') => Promise<void>;
  handleOAuthCallback: (provider: 'google' | 'github', code: string) => Promise<User>;
  
  // Password management
  passwordLoading: boolean;
  passwordError: string | null;
  passwordSuccess: string | null;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<{ resetLink?: string }>;
  resetPassword: (token: string, password: string) => Promise<void>;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  // Use all the custom hooks
  const auth = useAuth();
  const role = useRole();
  const permissions = usePermissions();
  const oauth = useOAuth();
  const password = usePassword();
  
  // Combine all values into context value
  const contextValue: AuthContextType = {
    // Authentication state
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    loading: auth.loading,
    
    // Role-based access
    role: role.role,
    isAdmin: role.isAdmin,
    isSuperAdmin: role.isSuperAdmin,
    isRegularUser: role.isRegularUser,
    
    // Permissions
    hasPermission: permissions.hasPermission,
    permissions: {
      canReadOwnProfile: permissions.canReadOwnProfile,
      canWriteOwnPosts: permissions.canWriteOwnPosts,
      canComment: permissions.canComment,
      canModerateContent: permissions.canModerateContent,
      canManageUsers: permissions.canManageUsers,
      canManageSystem: permissions.canManageSystem
    },
    
    // Authentication methods
    login: auth.login,
    register: auth.register,
    logout: auth.logout,
    refreshProfile: auth.refreshProfile,
    
    // OAuth methods
    oauthLoading: oauth.oauthLoading,
    oauthError: oauth.oauthError,
    handleOAuthLogin: oauth.handleOAuthLogin,
    handleOAuthCallback: oauth.handleOAuthCallback,
    
    // Password management
    passwordLoading: password.passwordLoading,
    passwordError: password.passwordError,
    passwordSuccess: password.passwordSuccess,
    changePassword: password.changePassword,
    forgotPassword: password.forgotPassword,
    resetPassword: password.resetPassword
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use the auth context
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

// Export all individual hooks for convenience
export { useAuth, useRole, usePermissions, useOAuth, usePassword };

// Export utility functions
export {
  AdminProtectedRoute,
  SuperAdminProtectedRoute,
  UserProtectedRoute,
  PermissionProtectedRoute
} from '@/components/ProtectedRoute';
