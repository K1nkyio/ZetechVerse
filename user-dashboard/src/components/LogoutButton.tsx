import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface LogoutButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary' | null | undefined;
  size?: 'default' | 'sm' | 'lg' | 'icon' | null | undefined;
  showText?: boolean;
  className?: string;
  redirectPath?: string;
  confirm?: boolean;
}

export function LogoutButton({ 
  variant = 'ghost', 
  size = 'default', 
  showText = true, 
  className = '',
  redirectPath = '/login',
  confirm = true
}: LogoutButtonProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
      
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out',
      });
      
      navigate(redirectPath, { replace: true });
    } catch (error) {
      toast({
        title: 'Logout Failed',
        description: 'Failed to log out. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => {
          if (confirm) {
            setOpen(true);
          } else {
            handleLogout();
          }
        }}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
        {showText && !loading && 'Logout'}
      </Button>

      {confirm && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Logout</DialogTitle>
              <DialogDescription>
                Are you sure you want to log out? You will need to sign in again to access your account.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleLogout} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Logging out...
                  </>
                ) : (
                  'Logout'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// Hook for programmatic logout
export function useLogout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);

  const performLogout = async (redirectPath: string = '/login') => {
    try {
      setLoading(true);
      await logout();
      
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out',
      });
      
      navigate(redirectPath, { replace: true });
    } catch (error) {
      toast({
        title: 'Logout Failed',
        description: 'Failed to log out. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    logout: performLogout,
    loading
  };
}