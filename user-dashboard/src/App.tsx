import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SkipLink from "@/components/SkipLink";
import { Suspense, lazy, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Opportunities from "./pages/Opportunities";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AuthCallback from "./pages/AuthCallback";
import { AuthProvider } from "@/contexts/auth-context";
import { useAuthContext } from "@/contexts/auth-context";
import { CartWishlistProvider } from "@/contexts/cart-wishlist-context";
import { ProtectedRoute, UserProtectedRoute } from "@/components/ProtectedRoute";
import { apiClient } from "@/api/base";
import { trackPageView } from "@/lib/analytics";
import "./i18n"; // Import i18n configurations

// Lazy load pages
const Marketplace = lazy(() => import("./pages/Marketplace"));
const Checkout = lazy(() => import("./pages/Checkout"));
// const Opportunities = lazy(() => import("./pages/Opportunities")); // Temporarily importing directly
const Confessions = lazy(() => import("./pages/Confessions"));
const Events = lazy(() => import("./pages/Events"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const Explore = lazy(() => import("./pages/Explore"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Forbidden = lazy(() => import("./pages/Forbidden"));
const BlogDetail = lazy(() => import("./pages/BlogDetail"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const Sitemap = lazy(() => import("./pages/Sitemap"));
const MarketplaceDetail = lazy(() => import("./pages/MarketplaceDetail"));
const OpportunityDetail = lazy(() => import("./pages/OpportunityDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Settings = lazy(() => import("./pages/Settings"));
const Notifications = lazy(() => import("./pages/Notifications"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

const queryClient = new QueryClient();

const AppRuntimeBootstrap = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuthContext();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const prefetchCore = async () => {
      await Promise.all([
        apiClient.prefetch('/posts/featured', { limit: 6 }, 90_000),
        apiClient.prefetch('/events/upcoming', { limit: 6 }, 90_000),
        apiClient.prefetch('/marketplace', { status: 'active', limit: 12 }, 60_000),
        apiClient.prefetch('/opportunities/featured', { limit: 6 }, 60_000),
        apiClient.prefetch('/confessions', { status: 'approved', limit: 12, sort_by: 'likes_count', sort_order: 'DESC' }, 30_000),
      ]);

      if (isAuthenticated) {
        await Promise.all([
          apiClient.prefetch('/notifications/unread-count', undefined, 20_000),
          apiClient.prefetch('/notifications', { limit: 10 }, 20_000),
        ]);
      }
    };

    void prefetchCore();
  }, [isAuthenticated]);

  return null;
};

const App = () => {
  console.log('App component rendering');

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
        <TooltipProvider>
          <AuthProvider>
            <CartWishlistProvider>
              <SkipLink />
              <Toaster />
              <Sonner />
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <AppRuntimeBootstrap />
                <Suspense fallback={
                  <div className="min-h-screen flex items-center justify-center">
                    <div>Loading application...</div>
                  </div>
                }>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/auth/callback/:provider" element={<AuthCallback />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/marketplace" element={<Marketplace />} />
                    <Route path="/marketplace/:id" element={<MarketplaceDetail />} />
                    <Route path="/checkout" element={
                      <UserProtectedRoute>
                        <Checkout />
                      </UserProtectedRoute>
                    } />
                    <Route path="/opportunities" element={<Opportunities />} />
                    <Route path="/opportunities/:id" element={<OpportunityDetail />} />
                    <Route path="/profile" element={
                      <UserProtectedRoute>
                        <Profile />
                      </UserProtectedRoute>
                    } />
                    <Route path="/dashboard" element={
                      <UserProtectedRoute>
                        <Dashboard />
                      </UserProtectedRoute>
                    } />
                    <Route path="/settings" element={
                      <UserProtectedRoute>
                        <Settings />
                      </UserProtectedRoute>
                    } />
                    <Route path="/notifications" element={
                      <UserProtectedRoute>
                        <Notifications />
                      </UserProtectedRoute>
                    } />
                    <Route path="/change-password" element={
                      <UserProtectedRoute>
                        <ChangePassword />
                      </UserProtectedRoute>
                    } />
                    <Route path="/confessions" element={<Confessions />} />
                    <Route path="/events" element={<Events />} />
                    <Route path="/events/:id" element={<EventDetail />} />
                    <Route path="/explore" element={<Explore />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/forbidden" element={<Forbidden />} />
                    <Route path="/blog/:id" element={<BlogDetail />} />
                    <Route path="/search" element={<SearchResults />} />
                    <Route path="/sitemap" element={<Sitemap />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </CartWishlistProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
