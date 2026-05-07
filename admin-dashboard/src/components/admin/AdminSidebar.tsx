import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Users,
  MessageSquare,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  User,
  ClipboardCheck,
  Shield,
  Zap,
  Briefcase,
  ShoppingBag,
  Calendar,
  Heart,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarItem {
  title: string;
  icon: React.ElementType;
  path: string;
}

interface AdminSidebarProps {
  variant: 'super-admin' | 'admin';
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobile?: boolean;
  mobileSidebarOpen?: boolean;
  onCloseMobile?: () => void;
  className?: string;
}

const superAdminItems: SidebarItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/super-admin" },
  { title: "Posts Management", icon: FileText, path: "/super-admin/posts" },
  { title: "Review Queue", icon: ClipboardCheck, path: "/super-admin/review" },
  { title: "Users & Admins", icon: Users, path: "/super-admin/users" },
  { title: "Confessions", icon: Heart, path: "/super-admin/confessions" },
  { title: "Comments", icon: MessageSquare, path: "/super-admin/comments" },
  { title: "Analytics", icon: BarChart3, path: "/super-admin/analytics" },
  { title: "Audit Logs", icon: Activity, path: "/super-admin/audit" },
  { title: "Profile", icon: User, path: "/super-admin/profile" },
];

const adminItems: SidebarItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { title: "My Posts", icon: FileText, path: "/admin/posts" },
  { title: "Create Post", icon: PlusCircle, path: "/admin/create" },
  { title: "Opportunities", icon: Briefcase, path: "/admin/opportunities" },
  { title: "Marketplace", icon: ShoppingBag, path: "/admin/marketplace" },
  { title: "Events", icon: Calendar, path: "/admin/events" },
  { title: "Confessions", icon: Heart, path: "/admin/confessions" },
  { title: "Comments", icon: MessageSquare, path: "/admin/comments" },
  { title: "Profile", icon: User, path: "/admin/profile" },
];

export function AdminSidebar({
  variant,
  collapsed,
  onToggleCollapse,
  isMobile = false,
  mobileSidebarOpen = false,
  onCloseMobile,
  className
}: AdminSidebarProps) {
  const location = useLocation();
  const items = variant === 'super-admin' ? superAdminItems : adminItems;
  const isSuperAdmin = variant === 'super-admin';
  const effectiveCollapsed = !isMobile && collapsed;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar transition-all duration-300 flex flex-col",
        effectiveCollapsed ? "w-[72px]" : "w-64",
        isMobile && "transform transition-transform duration-300 ease-in-out",
        isMobile ? (mobileSidebarOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0",
        className
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4 border-b border-sidebar-border">
        <div className={cn("flex items-center gap-2", effectiveCollapsed && "justify-center w-full")}>
          <div className={cn(
            "flex items-center justify-center rounded-lg",
            isSuperAdmin ? "bg-accent" : "bg-primary",
            "h-8 w-8 sm:h-9 sm:w-9"
          )}>
            {isSuperAdmin ? (
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-accent-foreground" />
            ) : (
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
            )}
          </div>
          {!effectiveCollapsed && (
            <div className="flex flex-col">
              <span className="font-display font-bold text-sm sm:text-base text-sidebar-foreground">
                ZetechVerse
              </span>
              <span className="text-xs text-sidebar-foreground/60 hidden sm:block">
                {isSuperAdmin ? 'Super Admin' : 'Admin Panel'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 sm:py-4 px-2 sm:px-3">
        <ul className="space-y-1">
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={() => {
                    if (isMobile && onCloseMobile) {
                      onCloseMobile();
                    }
                  }}
                  className={cn(
                    "sidebar-item",
                    isActive && "sidebar-item-active",
                    effectiveCollapsed && "justify-center px-2 sm:px-3"
                  )}
                  title={effectiveCollapsed ? item.title : undefined}
                >
                  <item.icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  {!effectiveCollapsed && <span className="truncate text-sm">{item.title}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse Toggle - Hidden on mobile */}
      <div className="hidden sm:block p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className={cn(
            "w-full justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            !effectiveCollapsed && "justify-start"
          )}
        >
          {effectiveCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
