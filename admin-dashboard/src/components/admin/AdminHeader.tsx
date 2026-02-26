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
import { cn } from "@/lib/utils";
import { apiClient } from "@/api/base";
import { NotificationBell } from "@/components/NotificationBell";

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
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback className="text-xs">AD</AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium">Admin User</span>
                <span className="text-xs text-muted-foreground">
                  {isSuperAdmin ? 'Super Admin' : 'Editor'}
                </span>
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
