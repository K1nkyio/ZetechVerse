import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const Forbidden = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-3">Access Denied</h1>
        <p className="text-muted-foreground mb-6">
          You do not have permission to view this page.
        </p>
        <Button asChild variant="outline">
          <Link to="/">Go back home</Link>
        </Button>
      </main>
      <Footer />
    </div>
  );
};

export default Forbidden;
