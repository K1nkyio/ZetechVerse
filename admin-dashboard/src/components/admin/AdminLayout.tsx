import { useState, useEffect } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";

interface AdminLayoutProps {
  children: React.ReactNode;
  variant: 'super-admin' | 'admin';
}

export function AdminLayout({ children, variant }: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024); // lg:1024px
      if (window.innerWidth >= 1024) {
        setMobileSidebarOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Handle menu click for both mobile and desktop
  const handleMenuClick = () => {
    if (isMobile) {
      setMobileSidebarOpen(!mobileSidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  return (
    <div className="admin-portal min-h-screen bg-muted/30">
      {/* Mobile sidebar overlay */}
      {isMobile && mobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      
      <AdminSidebar 
        variant={variant}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        isMobile={isMobile}
        mobileSidebarOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />
      
      <header
        className={`fixed top-0 right-0 h-14 sm:h-16 bg-card border-b border-border flex items-center justify-between px-3 sm:px-6 transition-all duration-300 z-30 ${
          isMobile ? "left-0" : (sidebarCollapsed ? "lg:left-[72px]" : "lg:left-64")
        }`}
      >
        <AdminHeader
          variant={variant}
          sidebarCollapsed={sidebarCollapsed}
          onMenuClick={handleMenuClick}
          isMobile={isMobile}
          mobileSidebarOpen={mobileSidebarOpen}
        />
      </header>
      
      {/* Main content */}
      <main className={`transition-all duration-300 ease-in-out min-h-screen pt-16 ${
        isMobile ? "ml-0" : (sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-64")
      }`}>
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
