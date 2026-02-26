import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/api/base";

let inFlightProfileRequest: Promise<any> | null = null;
let lastProfileCheckAt = 0;

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles: string[];
  redirectTo?: string;
}

export function RoleProtectedRoute({
  children,
  requiredRoles,
  redirectTo = "/login"
}: RoleProtectedRouteProps) {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const checkAuthAndRole = async () => {
      try {
        // First check if user is authenticated
        const token = apiClient.getToken();

        if (!token) {
          console.log('RoleProtectedRoute: No token found, redirecting to appropriate login');
          if (isMounted) {
            setIsAuthenticated(false);
            setIsAuthorized(false);
            setCheckedAuth(true);
          }
          setTimeout(() => {
            // Redirect to appropriate login based on required roles
            if (requiredRoles.includes('super_admin')) {
              navigate('/super-admin/login', { replace: true });
            } else if (requiredRoles.includes('admin')) {
              navigate('/admin/login', { replace: true });
            } else {
              navigate(redirectTo, { replace: true });
            }
          }, 50);
          return;
        }

        if (isMounted) {
          setIsAuthenticated(true);
        }

        // Get user profile to check role
        const now = Date.now();
        const minIntervalMs = 2000;
        if (now - lastProfileCheckAt < minIntervalMs) {
          await sleep(minIntervalMs - (now - lastProfileCheckAt));
        }

        lastProfileCheckAt = Date.now();
        if (!inFlightProfileRequest) {
          inFlightProfileRequest = apiClient.get('/auth/profile').finally(() => {
            inFlightProfileRequest = null;
          });
        }

        let response: any;
        try {
          response = await inFlightProfileRequest;
        } catch (error: any) {
          if (error?.status === 429) {
            console.warn('RoleProtectedRoute: Rate limited (429) checking profile, backing off');
            await sleep(2500);
            // Try once more after backoff
            response = await apiClient.get('/auth/profile');
          } else {
            throw error;
          }
        }

        if (response.data.success && response.data.data?.role) {
          const userRole = response.data.data.role;
          console.log('RoleProtectedRoute: User role:', userRole);
          console.log('RoleProtectedRoute: Required roles:', requiredRoles);

          const hasRequiredRole = requiredRoles.includes(userRole);
          console.log('RoleProtectedRoute: Has required role:', hasRequiredRole);

          if (isMounted) {
            setIsAuthorized(hasRequiredRole);
          }

          if (!hasRequiredRole) {
            console.log('RoleProtectedRoute: User does not have required role, redirecting');
            setTimeout(() => {
              // Redirect to appropriate dashboard or login based on user role and required roles
              if (userRole === 'super_admin') {
                navigate('/super-admin', { replace: true });
              } else if (userRole === 'admin' && requiredRoles.includes('super_admin')) {
                // Admin trying to access super admin area
                navigate('/super-admin/login', { replace: true });
              } else if (userRole === 'admin') {
                navigate('/admin', { replace: true });
              } else {
                // Regular user or unauthorized access
                navigate('/', { replace: true });
              }
            }, 50);
          }
        } else {
          console.log('RoleProtectedRoute: Failed to get user profile');
          if (isMounted) {
            setIsAuthorized(false);
          }
          setTimeout(() => {
            navigate(redirectTo, { replace: true });
          }, 50);
        }
      } catch (error) {
        console.error('RoleProtectedRoute: Error checking auth/role:', error);
        if (isMounted) {
          setIsAuthenticated(false);
          setIsAuthorized(false);
          setCheckedAuth(true);
        }
        setTimeout(() => {
          navigate(redirectTo, { replace: true });
        }, 50);
      } finally {
        if (isMounted) {
          setCheckedAuth(true);
        }
      }
    };

    checkAuthAndRole();

    // Listen for storage changes (in case token is set in another tab)
    const handleStorageChange = () => {
      console.log('RoleProtectedRoute: Storage changed, rechecking auth');
      checkAuthAndRole();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [navigate, redirectTo, requiredRoles]);

  // Show loading while checking authentication and authorization
  if (!checkedAuth || isAuthenticated === null || isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
