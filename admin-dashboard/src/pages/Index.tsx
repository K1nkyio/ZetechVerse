import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Zap, ArrowRight, FileText, Users, BarChart3 } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <nav className="container mx-auto px-4 sm:px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between relative z-10">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
              <Zap className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold font-display text-foreground">ZetechVerse</span>
          </div>
          <div className="hidden sm:flex sm:flex-row gap-3">
            <Button variant="ghost" asChild className="w-full sm:w-auto">
              <Link to="/admin/login?prompt=login">Admin Login</Link>
            </Button>
            <Button asChild className="w-full sm:w-auto gradient-primary text-primary-foreground">
              <Link to="/super-admin/login?prompt=login">Super Admin Login</Link>
            </Button>
          </div>
        </nav>

        <div className="container mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center relative z-10">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold font-display text-foreground mb-6 animate-fade-in">
            Content Management
            <br />
            <span className="text-primary">Made Simple</span>
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 animate-slide-up">
            Powerful admin dashboards for managing your content, users, and platform analytics.
            Built for ZetechVerse.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '100ms' }}>
            <Button size="lg" asChild className="gradient-primary text-primary-foreground">
              <Link to="/super-admin/login?prompt=login">
                <Shield className="mr-2 h-5 w-5" />
                Super Admin Login
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/admin/login?prompt=login">
                <Zap className="mr-2 h-5 w-5" />
                Admin Login
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-16 sm:py-24 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-center text-foreground mb-4">
            Two Powerful Dashboards
          </h2>
          <p className="text-center text-muted-foreground mb-10 sm:mb-12 max-w-2xl mx-auto">
            Role-based access control with dedicated interfaces for different user types
          </p>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Super Admin Card */}
            <Card className="admin-card group hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 rounded-xl gradient-accent flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-accent-foreground" />
                </div>
                <CardTitle className="font-display text-xl sm:text-2xl">Super Admin</CardTitle>
                <CardDescription>Full platform control and oversight</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {[
                    "Review and approve all posts",
                    "Manage users and admin roles",
                    "Moderate all comments",
                    "View platform analytics",
                    "Configure site settings",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-muted-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full gradient-accent text-accent-foreground group-hover:shadow-glow">
                  <Link to="/super-admin/login?prompt=login">
                    Login as Super Admin
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Admin Card */}
            <Card className="admin-card group hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="font-display text-xl sm:text-2xl">Admin / Editor</CardTitle>
                <CardDescription>Create and manage your content</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {[
                    "Create and edit posts",
                    "Submit posts for review",
                    "Manage comments on your posts",
                    "View your content stats",
                    "Update your profile",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-muted-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full gradient-primary text-primary-foreground">
                  <Link to="/admin/login?prompt=login">
                    Login as Admin
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 text-center">
            {[
              { icon: FileText, value: "248", label: "Total Posts" },
              { icon: Users, value: "1,247", label: "Active Users" },
              { icon: BarChart3, value: "124K", label: "Total Views" },
              { icon: Shield, value: "14", label: "Admins" },
            ].map((stat) => (
              <div key={stat.label} className="space-y-1 sm:space-y-2">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold font-display text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 sm:px-6 text-center text-muted-foreground">
          <p>&copy; 2024 ZetechVerse. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
