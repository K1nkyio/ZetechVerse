import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Calendar, Heart } from 'lucide-react';

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main id="main-content" className="container-blog py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              About ZetechVerse
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Connecting Zetech University students, fostering opportunities, and building community
            </p>
          </div>

          {/* Hero Section */}
          <div className="mb-16">
            <div className="aspect-video rounded-lg bg-muted mb-8 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 bg-primary rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Heart className="h-12 w-12 text-primary-foreground" />
                </div>
                <p className="text-muted-foreground">Author Photo Placeholder</p>
              </div>
            </div>
          </div>

          {/* About Content */}
          <div className="grid md:grid-cols-2 gap-12 mb-16">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-foreground">Our Mission</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  ZetechVerse was created by and for Zetech University students. As Kenya's leading
                  technology university, Zetech produces innovative thinkers and leaders who shape the
                  future of technology, business, and society.
                </p>
                <p>
                  Our platform serves as the digital heartbeat of the Zetech community, connecting students
                  with opportunities, resources, and each other. Whether you're looking for your next internship,
                  selling textbooks, sharing campus experiences, or discovering upcoming events, ZetechVerse
                  is your one-stop destination.
                </p>
                <p>
                  We believe in empowering the next generation of innovators, entrepreneurs, and leaders
                  by creating spaces where knowledge flows freely and opportunities abound.
                </p>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-4">What We Offer</h3>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-muted-foreground">Student Marketplace for buying/selling</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-muted-foreground">Job & Internship Opportunities</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-muted-foreground">Campus Confessions & Discussions</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-muted-foreground">Events Calendar & Community Activities</span>
                  </li>
                </ul>
              </div>

              <div className="bg-muted p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-foreground mb-4">Zetech University Facts</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span className="text-muted-foreground">Founded in 1999</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <span className="text-muted-foreground">Multiple campuses across Kenya</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <span className="text-muted-foreground">15,000+ students enrolled</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center bg-muted p-8 rounded-lg">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Join the ZetechVerse Community
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Whether you're a current student, alumni, or faculty member, ZetechVerse is your gateway
              to the vibrant Zetech University community. Connect, discover, and grow together.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link to="/marketplace">Explore Marketplace</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/opportunities">Find Opportunities</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default About;