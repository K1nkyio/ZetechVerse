import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/api/base";

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({ children, redirectTo = "/login" }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const token = apiClient.getToken();

      console.log('ProtectedRoute: Checking auth...');
      console.log('ProtectedRoute: token:', !!token);

      if (!token) {
        console.log('ProtectedRoute: No token found, redirecting to login');
        setIsAuthenticated(false);
        setCheckedAuth(true);
        // Give a brief moment before redirecting to ensure state updates
        setTimeout(() => {
          navigate(redirectTo, { replace: true });
        }, 50);
      } else {
        console.log('ProtectedRoute: Token found, allowing access');
        setIsAuthenticated(true);
        setCheckedAuth(true);
      }
    };

    // Initial check
    checkAuth();

    // Also listen for storage changes (in case token is set in another tab)
    const handleStorageChange = () => {
      console.log('ProtectedRoute: Storage changed, rechecking auth');
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [navigate, redirectTo]);

  // Show loading while checking authentication
  if (!checkedAuth || isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
