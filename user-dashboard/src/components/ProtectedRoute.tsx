import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/services/auth.service";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requiredRole?: 'user' | 'admin' | 'super_admin';
  requiredPermission?: string;
}

export function ProtectedRoute({ 
  children, 
  redirectTo = "/login", 
  requiredRole,
  requiredPermission 
}: ProtectedRouteProps) {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      console.log('ProtectedRoute: Checking auth...');
      
      // Check if user is authenticated
      if (!authService.isAuthenticated()) {
        console.log('ProtectedRoute: Not authenticated, redirecting to login');
        setIsAuthenticated(false);
        setCheckedAuth(true);
        setTimeout(() => {
          navigate(redirectTo, { replace: true });
        }, 50);
        return;
      }

      console.log('ProtectedRoute: Authenticated');

      // Check role requirement
      if (requiredRole) {
        const userRole = authService.getUserRole();
        console.log('ProtectedRoute: Required role:', requiredRole, 'User role:', userRole);

        // Enforce exact role match when a role is required
        if (!userRole || userRole !== requiredRole) {
          console.log('ProtectedRoute: Access denied - role mismatch');
          setIsAuthenticated(false);
          setCheckedAuth(true);
          navigate(redirectTo, { replace: true });
          return;
        }
      }

      // Check permission requirement
      if (requiredPermission) {
        console.log('ProtectedRoute: Required permission:', requiredPermission);
        if (!authService.hasPermission(requiredPermission)) {
          console.log('ProtectedRoute: Insufficient permissions');
          navigate('/forbidden', { replace: true });
          return;
        }
      }

      console.log('ProtectedRoute: All checks passed');
      setIsAuthenticated(true);
      setHasPermission(true);
      setCheckedAuth(true);
    };

    // Initial check
    checkAuth();

    // Listen for auth state changes
    const handleAuthChange = () => {
      console.log('ProtectedRoute: Auth state changed, rechecking');
      checkAuth();
    };

    window.addEventListener('storage', handleAuthChange);
    return () => window.removeEventListener('storage', handleAuthChange);
  }, [navigate, redirectTo, requiredRole, requiredPermission]);

  // Show loading while checking authentication
  if (!checkedAuth || isAuthenticated === null || (requiredPermission && hasPermission === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredPermission && !hasPermission) {
    return null;
  }

  return <>{children}</>;
}

// Role-specific Protected Routes
export function UserProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="user" redirectTo="/login">
      {children}
    </ProtectedRoute>
  );
}

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="admin" redirectTo="/admin/login">
      {children}
    </ProtectedRoute>
  );
}

export function SuperAdminProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="super_admin" redirectTo="/super-admin/login">
      {children}
    </ProtectedRoute>
  );
}

// Permission-based Protected Routes
export function PermissionProtectedRoute({ 
  children, 
  permission 
}: { 
  children: React.ReactNode; 
  permission: string;
}) {
  return (
    <ProtectedRoute requiredPermission={permission}>
      {children}
    </ProtectedRoute>
  );
}