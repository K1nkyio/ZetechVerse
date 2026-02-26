import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute";
import Index from "./pages/Index";
import RoleSelector from "./pages/RoleSelector";
import AdminLogin from "./pages/AdminLogin";
import AdminRequest from "./pages/AdminRequest";
import SuperAdminLogin from "./pages/SuperAdminLogin";
import NotFound from "./pages/NotFound";
import APITest from "./pages/APITest";

// Super Admin Pages
import SuperAdminDashboard from "./pages/super-admin/Dashboard";
import SuperAdminPosts from "./pages/super-admin/Posts";
import SuperAdminReview from "./pages/super-admin/Review";
import SuperAdminUsers from "./pages/super-admin/Users";
import SuperAdminComments from "./pages/super-admin/Comments";
import SuperAdminAnalytics from "./pages/super-admin/Analytics";
import SuperAdminConfessions from "./pages/super-admin/Confessions";
import SuperAdminProfile from "./pages/super-admin/Profile";
import SuperAdminNotifications from "./pages/super-admin/Notifications";

// Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminPosts from "./pages/admin/Posts";
import AdminCreatePost from "./pages/admin/CreatePost";
import AdminEditPost from "./pages/admin/EditPost";
import AdminViewPost from "./pages/admin/ViewPost";
import AdminComments from "./pages/admin/Comments";
import AdminProfile from "./pages/admin/Profile";
import AdminNotifications from "./pages/admin/Notifications";
import AdminOpportunities from "./pages/admin/Opportunities";
import AdminCreateOpportunity from "./pages/admin/CreateOpportunity";
import AdminEditOpportunity from "./pages/admin/EditOpportunity";
import AdminViewOpportunity from "./pages/admin/ViewOpportunity";
import AdminMarketplace from "./pages/admin/Marketplace";
import AdminCreateMarketplace from "./pages/admin/CreateMarketplace";
import AdminEditMarketplace from "./pages/admin/EditMarketplace";
import AdminViewMarketplace from "./pages/admin/ViewMarketplace";
import AdminEvents from "./pages/admin/Events";
import AdminCreateEvent from "./pages/admin/CreateEvent";
import AdminEditEvent from "./pages/admin/EditEvent";
import AdminViewEvent from "./pages/admin/ViewEvent";
import AdminConfessions from "./pages/admin/Confessions";
import AdminViewConfession from "./pages/admin/ViewConfession";

const queryClient = new QueryClient();

const SUPER_ADMIN_ROLES: string[] = ['super_admin'];
const ADMIN_OR_SUPER_ADMIN_ROLES: string[] = ['admin', 'super_admin'];
const ADMIN_ONLY_ROLES: string[] = ['admin'];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/select-role" element={<RoleSelector />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/request" element={<AdminRequest />} />
          <Route path="/super-admin/login" element={<SuperAdminLogin />} />
          <Route path="/login" element={<RoleSelector />} /> {/* Default login shows role selector */}
          <Route path="/api-test" element={<APITest />} />

          {/* Super Admin Routes */}
          <Route path="/super-admin" element={<RoleProtectedRoute requiredRoles={SUPER_ADMIN_ROLES}><SuperAdminDashboard /></RoleProtectedRoute>} />
          <Route path="/super-admin/posts" element={<RoleProtectedRoute requiredRoles={SUPER_ADMIN_ROLES}><SuperAdminPosts /></RoleProtectedRoute>} />
          <Route path="/super-admin/posts/:id" element={<RoleProtectedRoute requiredRoles={SUPER_ADMIN_ROLES}><AdminViewPost /></RoleProtectedRoute>} />
          <Route path="/super-admin/edit/:id" element={<RoleProtectedRoute requiredRoles={SUPER_ADMIN_ROLES}><AdminEditPost /></RoleProtectedRoute>} />
          <Route path="/super-admin/review" element={<RoleProtectedRoute requiredRoles={SUPER_ADMIN_ROLES}><SuperAdminReview /></RoleProtectedRoute>} />
          <Route path="/super-admin/users" element={<RoleProtectedRoute requiredRoles={SUPER_ADMIN_ROLES}><SuperAdminUsers /></RoleProtectedRoute>} />
          <Route path="/super-admin/comments" element={<RoleProtectedRoute requiredRoles={SUPER_ADMIN_ROLES}><SuperAdminComments /></RoleProtectedRoute>} />
          <Route path="/super-admin/confessions" element={<RoleProtectedRoute requiredRoles={SUPER_ADMIN_ROLES}><SuperAdminConfessions /></RoleProtectedRoute>} />
          <Route path="/super-admin/confessions/:id" element={<RoleProtectedRoute requiredRoles={SUPER_ADMIN_ROLES}><AdminViewConfession /></RoleProtectedRoute>} />
          <Route path="/super-admin/analytics" element={<RoleProtectedRoute requiredRoles={SUPER_ADMIN_ROLES}><SuperAdminAnalytics /></RoleProtectedRoute>} />
          <Route path="/super-admin/profile" element={<RoleProtectedRoute requiredRoles={SUPER_ADMIN_ROLES}><SuperAdminProfile /></RoleProtectedRoute>} />
          <Route path="/super-admin/notifications" element={<RoleProtectedRoute requiredRoles={SUPER_ADMIN_ROLES}><SuperAdminNotifications /></RoleProtectedRoute>} />

          {/* Admin Routes */}
          <Route path="/admin" element={<RoleProtectedRoute requiredRoles={ADMIN_OR_SUPER_ADMIN_ROLES}><AdminDashboard /></RoleProtectedRoute>} />
          <Route path="/admin/posts" element={<RoleProtectedRoute requiredRoles={ADMIN_OR_SUPER_ADMIN_ROLES}><AdminPosts /></RoleProtectedRoute>} />
          <Route path="/admin/create" element={<RoleProtectedRoute requiredRoles={ADMIN_OR_SUPER_ADMIN_ROLES}><AdminCreatePost /></RoleProtectedRoute>} />
          <Route path="/admin/edit/:id" element={<RoleProtectedRoute requiredRoles={ADMIN_OR_SUPER_ADMIN_ROLES}><AdminEditPost /></RoleProtectedRoute>} />
          <Route path="/admin/posts/:id" element={<RoleProtectedRoute requiredRoles={ADMIN_OR_SUPER_ADMIN_ROLES}><AdminViewPost /></RoleProtectedRoute>} />
          <Route path="/admin/opportunities" element={<RoleProtectedRoute requiredRoles={ADMIN_OR_SUPER_ADMIN_ROLES}><AdminOpportunities /></RoleProtectedRoute>} />
          <Route path="/admin/opportunities/create" element={<RoleProtectedRoute requiredRoles={ADMIN_OR_SUPER_ADMIN_ROLES}><AdminCreateOpportunity /></RoleProtectedRoute>} />
          <Route path="/admin/opportunities/:id" element={<RoleProtectedRoute requiredRoles={ADMIN_OR_SUPER_ADMIN_ROLES}><AdminViewOpportunity /></RoleProtectedRoute>} />
          <Route path="/admin/opportunities/:id/edit" element={<RoleProtectedRoute requiredRoles={ADMIN_OR_SUPER_ADMIN_ROLES}><AdminEditOpportunity /></RoleProtectedRoute>} />
          <Route path="/admin/marketplace" element={<RoleProtectedRoute requiredRoles={ADMIN_OR_SUPER_ADMIN_ROLES}><AdminMarketplace /></RoleProtectedRoute>} />
          <Route path="/admin/marketplace/create" element={<RoleProtectedRoute requiredRoles={ADMIN_OR_SUPER_ADMIN_ROLES}><AdminCreateMarketplace /></RoleProtectedRoute>} />
          <Route path="/admin/marketplace/:id" element={<RoleProtectedRoute requiredRoles={ADMIN_OR_SUPER_ADMIN_ROLES}><AdminViewMarketplace /></RoleProtectedRoute>} />
          <Route path="/admin/marketplace/:id/edit" element={<RoleProtectedRoute requiredRoles={ADMIN_OR_SUPER_ADMIN_ROLES}><AdminEditMarketplace /></RoleProtectedRoute>} />
          <Route path="/admin/events" element={<RoleProtectedRoute requiredRoles={ADMIN_OR_SUPER_ADMIN_ROLES}><AdminEvents /></RoleProtectedRoute>} />
          <Route path="/admin/events/create" element={<RoleProtectedRoute requiredRoles={ADMIN_OR_SUPER_ADMIN_ROLES}><AdminCreateEvent /></RoleProtectedRoute>} />
          <Route path="/admin/events/:id" element={<RoleProtectedRoute requiredRoles={ADMIN_OR_SUPER_ADMIN_ROLES}><AdminViewEvent /></RoleProtectedRoute>} />
          <Route path="/admin/events/:id/edit" element={<RoleProtectedRoute requiredRoles={ADMIN_OR_SUPER_ADMIN_ROLES}><AdminEditEvent /></RoleProtectedRoute>} />
          <Route path="/admin/confessions" element={<RoleProtectedRoute requiredRoles={ADMIN_ONLY_ROLES}><AdminConfessions /></RoleProtectedRoute>} />
          <Route path="/admin/confessions/:id" element={<RoleProtectedRoute requiredRoles={ADMIN_ONLY_ROLES}><AdminViewConfession /></RoleProtectedRoute>} />
          <Route path="/admin/comments" element={<RoleProtectedRoute requiredRoles={ADMIN_OR_SUPER_ADMIN_ROLES}><AdminComments /></RoleProtectedRoute>} />
          <Route path="/admin/profile" element={<RoleProtectedRoute requiredRoles={ADMIN_OR_SUPER_ADMIN_ROLES}><AdminProfile /></RoleProtectedRoute>} />
          <Route path="/admin/notifications" element={<RoleProtectedRoute requiredRoles={ADMIN_OR_SUPER_ADMIN_ROLES}><AdminNotifications /></RoleProtectedRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
