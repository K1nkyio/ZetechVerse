import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/contexts/auth-context';

interface ProtectOptions {
  requiredRole?: 'user' | 'admin' | 'super_admin';
  requiredPermission?: string;
  redirectTo?: string;
  message?: string;
}

export function useProtect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { 
    isAuthenticated, 
    isAdmin, 
    isSuperAdmin, 
    hasPermission,
    role 
  } = useAuthContext();

  const protect = (
    action: () => void,
    options: ProtectOptions = {}
  ) => {
    const {
      requiredRole,
      requiredPermission,
      redirectTo = '/login',
      message = 'Please log in to continue'
    } = options;

    // Check authentication
    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: message || 'Please log in to continue',
        variant: 'destructive'
      });
      navigate(redirectTo, { replace: true, state: { from: location } });
      return false;
    }

    // Check role requirements
    if (requiredRole) {
      const roleCheck = {
        'user': role === 'user',
        'admin': isAdmin,
        'super_admin': isSuperAdmin
      }[requiredRole];

      if (!roleCheck) {
        toast({
          title: 'Insufficient Permissions',
          description: `This action requires ${requiredRole} role`,
          variant: 'destructive'
        });
        
        // Redirect to appropriate page based on role
        if (requiredRole === 'super_admin' && role === 'admin') {
          navigate('/unauthorized', { replace: true });
        } else {
          navigate(redirectTo, { replace: true });
        }
        return false;
      }
    }

    // Check permission requirements
    if (requiredPermission && !hasPermission(requiredPermission)) {
      toast({
        title: 'Insufficient Permissions',
        description: `This action requires ${requiredPermission} permission`,
        variant: 'destructive'
      });
      navigate('/forbidden', { replace: true });
      return false;
    }

    // If all checks pass, execute the action
    try {
      action();
      return true;
    } catch (error) {
      console.error('Protected action failed:', error);
      toast({
        title: 'Action Failed',
        description: 'An error occurred while performing the action',
        variant: 'destructive'
      });
      return false;
    }
  };

  const protectAsync = async (
    action: () => Promise<void>,
    options: ProtectOptions = {}
  ) => {
    const {
      requiredRole,
      requiredPermission,
      redirectTo = '/login',
      message = 'Please log in to continue'
    } = options;

    // Check authentication
    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: message || 'Please log in to continue',
        variant: 'destructive'
      });
      navigate(redirectTo, { replace: true, state: { from: location } });
      return false;
    }

    // Check role requirements
    if (requiredRole) {
      const roleCheck = {
        'user': role === 'user',
        'admin': isAdmin,
        'super_admin': isSuperAdmin
      }[requiredRole];

      if (!roleCheck) {
        toast({
          title: 'Insufficient Permissions',
          description: `This action requires ${requiredRole} role`,
          variant: 'destructive'
        });
        
        // Redirect to appropriate page based on role
        if (requiredRole === 'super_admin' && role === 'admin') {
          navigate('/unauthorized', { replace: true });
        } else {
          navigate(redirectTo, { replace: true });
        }
        return false;
      }
    }

    // Check permission requirements
    if (requiredPermission && !hasPermission(requiredPermission)) {
      toast({
        title: 'Insufficient Permissions',
        description: `This action requires ${requiredPermission} permission`,
        variant: 'destructive'
      });
      navigate('/forbidden', { replace: true });
      return false;
    }

    // If all checks pass, execute the action
    try {
      await action();
      return true;
    } catch (error) {
      console.error('Protected async action failed:', error);
      toast({
        title: 'Action Failed',
        description: 'An error occurred while performing the action',
        variant: 'destructive'
      });
      return false;
    }
  };

  return {
    protect,
    protectAsync,
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    hasPermission,
    role
  };
}

// Hook for checking if user can access a route
export function useRouteAccess() {
  const { isAuthenticated, isAdmin, isSuperAdmin, hasPermission, role } = useAuthContext();

  const canAccess = (options: {
    requiredRole?: 'user' | 'admin' | 'super_admin';
    requiredPermission?: string;
  }) => {
    const { requiredRole, requiredPermission } = options;

    // Check authentication
    if (!isAuthenticated) return false;

    // Check role requirements
    if (requiredRole) {
      const roleCheck = {
        'user': role === 'user',
        'admin': role === 'admin',
        'super_admin': role === 'super_admin'
      }[requiredRole];

      if (!roleCheck) return false;
    }

    // Check permission requirements
    if (requiredPermission && !hasPermission(requiredPermission)) {
      return false;
    }

    return true;
  };

  return {
    canAccess,
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    hasPermission,
    role
  };
}