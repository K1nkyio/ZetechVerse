import { useEffect, useState } from "react";
import { Bell, LogOut, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/api/base";
import { NotificationBell } from "@/components/NotificationBell";
import { profileApi, type UserProfile } from "@/api/profile.api";

interface AdminHeaderProps {
  sidebarCollapsed?: boolean;
  onMenuClick?: () => void;
  variant: 'super-admin' | 'admin';
  isMobile?: boolean;
  mobileSidebarOpen?: boolean;
}

export function AdminHeader({ sidebarCollapsed, onMenuClick, variant, isMobile, mobileSidebarOpen }: AdminHeaderProps) {
  const navigate = useNavigate();
  const isSuperAdmin = variant === 'super-admin';
  const [profile, setProfile] = useState<Pick<UserProfile, "username" | "full_name" | "avatar_url" | "role"> | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        if (!apiClient.getToken()) return;
        const data = await profileApi.getProfile();
        setProfile({
          username: data.username,
          full_name: data.full_name,
          avatar_url: data.avatar_url,
          role: data.role,
        });
      } catch {
        // Keep header resilient if profile fetch fails.
      }
    };

    const handleProfileUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<UserProfile>;
      const updated = customEvent.detail;
      if (!updated) return;

      setProfile((prev) => ({
        username: updated.username || prev?.username || "",
        full_name: updated.full_name,
        avatar_url: updated.avatar_url,
        role: updated.role || prev?.role || (isSuperAdmin ? "super_admin" : "admin"),
      }));
    };

    void loadProfile();
    window.addEventListener("admin-profile-updated", handleProfileUpdated as EventListener);

    return () => {
      window.removeEventListener("admin-profile-updated", handleProfileUpdated as EventListener);
    };
  }, [isSuperAdmin]);

  const displayName = profile?.full_name?.trim() || profile?.username || "Admin User";
  const displayRole = profile?.role
    ? profile.role.replace("_", " ")
    : isSuperAdmin
      ? "Super Admin"
      : "Editor";
  const avatarFallback = (displayName || "A")
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header
      className="flex items-center justify-between w-full h-full"
    >
      <div className="flex items-center gap-2 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-8 w-8 sm:h-10 sm:w-10"
          onClick={onMenuClick}
        >
          <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
        <h1 className="text-base sm:text-lg font-semibold font-display text-foreground truncate">
          <span className="hidden sm:inline">
            {isSuperAdmin ? 'Super Admin Dashboard' : 'Admin Dashboard'}
          </span>
          <span className="sm:hidden">
            {isSuperAdmin ? 'Super Admin' : 'Admin'}
          </span>
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notifications */}
        <NotificationBell variant={variant} />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 h-8 sm:h-10">
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">{avatarFallback}</AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium">{displayName}</span>
                <span className="text-xs text-muted-foreground capitalize">{displayRole}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 sm:w-56 bg-popover">
            <DropdownMenuLabel className="text-sm">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(isSuperAdmin ? '/super-admin/profile' : '/admin/profile')} className="text-sm">
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(isSuperAdmin ? '/super-admin/notifications' : '/admin/notifications')} className="text-sm">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              apiClient.setToken(null);
              navigate('/admin');
            }} className="text-destructive focus:text-destructive text-sm">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
