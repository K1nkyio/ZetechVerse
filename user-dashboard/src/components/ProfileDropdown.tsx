import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Settings, 
  ChevronDown,
  UserCircle
} from 'lucide-react';
import { useAuthContext } from '@/contexts/auth-context';
import { LogoutButton } from '@/components/LogoutButton';
import { getProfileCompletionSummary } from '@/lib/profile-completion';
import { profileApi, type UserProfile } from '@/api/profile.api';
import { careerApi, type CareerProfile } from '@/api/career.api';

interface ProfileDropdownProps {
  onCloseMenu?: () => void;
}

const ProfileDropdown = ({ onCloseMenu }: ProfileDropdownProps = {}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [profileDetails, setProfileDetails] = useState<UserProfile | null>(null);
  const [careerDetails, setCareerDetails] = useState<CareerProfile | null>(null);
  const [completionLoading, setCompletionLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthContext();
  const completionSummary = getProfileCompletionSummary(profileDetails ?? user, careerDetails);
  const { percentage: completion, statusLabel } = completionSummary;

  useEffect(() => {
    if (!isAuthenticated) {
      setProfileDetails(null);
      setCareerDetails(null);
      setCompletionLoading(false);
      return;
    }

    let isActive = true;

    const loadCompletionData = async () => {
      try {
        setCompletionLoading(true);
        const [profileResult, careerResult] = await Promise.allSettled([
          profileApi.getProfile(),
          careerApi.getProfile(),
        ]);

        if (!isActive) return;

        if (profileResult.status === 'fulfilled') {
          setProfileDetails(profileResult.value);
        }

        if (careerResult.status === 'fulfilled') {
          setCareerDetails(careerResult.value);
        }
      } finally {
        if (isActive) {
          setCompletionLoading(false);
        }
      }
    };

    void loadCompletionData();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, isOpen, user?.id, user?.updated_at]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => {
            navigate('/login');
            onCloseMenu?.();
          }}
          className="h-9 rounded-full border border-border/70 bg-background/35 px-4 text-sm text-foreground shadow-none hover:bg-muted/70 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          Sign In
        </Button>
        <Button 
          variant="default" 
          size="sm" 
          onClick={() => {
            navigate('/register');
            onCloseMenu?.();
          }}
          className="h-9 rounded-full px-4 text-sm font-semibold shadow-[0_16px_32px_-18px_hsl(var(--primary)/0.95)]"
        >
          Sign Up
        </Button>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 w-9 rounded-full p-0 flex items-center justify-center group"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="User profile menu"
      >
        <div className="relative">
          {user?.avatar_url ? (
            <img 
              src={user.avatar_url} 
              alt={user.username}
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <UserCircle className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
          <ChevronDown className={`h-3 w-3 absolute -bottom-1 -right-1 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-popover border border-border shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in-0 zoom-in-95">
          <div className="p-2">
            {/* User Info */}
            <div className="px-2 py-3 border-b border-border/50 mb-2 space-y-2">
              <div className="flex items-center gap-3">
                {user?.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt={user.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user?.full_name || user?.username}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{user?.username}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Profile</span>
                  <Badge variant={completion >= 75 ? 'default' : 'secondary'} className="text-[10px]">
                    {completionLoading ? 'Syncing' : statusLabel}
                  </Badge>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${completion}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {completionLoading ? 'Checking setup...' : `${completion}% complete`}
                </p>
              </div>
            </div>

            {/* Profile Menu Items */}
            <div className="space-y-1">
              <Link
                to="/profile"
                className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => {
                  setIsOpen(false);
                  onCloseMenu?.();
                }}
              >
                <User className="h-4 w-4" />
                <span>Profile</span>
              </Link>

              <Link
                to="/settings"
                className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => {
                  setIsOpen(false);
                  onCloseMenu?.();
                }}
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>

              <div className="border-t border-border/50 pt-1 mt-1">
                <LogoutButton 
                  variant="ghost"
                  size="sm"
                  showText={true}
                  confirm={false}
                  className="w-full justify-start h-9 px-3 text-sm hover:bg-destructive/10 hover:text-destructive"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
