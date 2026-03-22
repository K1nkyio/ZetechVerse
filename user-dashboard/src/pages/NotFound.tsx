import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          {/* Large 404 */}
          <h1 className="text-8xl md:text-9xl font-bold text-foreground/20 mb-8 select-none">
            404
          </h1>
          
          {/* Main heading */}
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Page Not Found
          </h2>
          
          {/* Description */}
          <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto leading-relaxed">
            Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or the URL was mistyped.
          </p>
          
          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg">
              <Link to="/">
                Return to Home
              </Link>
            </Button>
            
            <Button variant="outline" asChild size="lg">
              <Link to="/explore">
                Browse All Posts
              </Link>
            </Button>
          </div>
          
          {/* Helpful links */}
          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground mb-4">
              You might be looking for:
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <Link to="/" className="text-foreground hover:text-primary transition-colors">
                Homepage
              </Link>
              <Link to="/explore" className="text-foreground hover:text-primary transition-colors">
                Browse All Posts
              </Link>
              <Link to="/marketplace" className="text-foreground hover:text-primary transition-colors">
                Marketplace
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
