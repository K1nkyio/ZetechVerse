import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, MessageSquare, Send, MapPin } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulate form submission
    toast({
      title: "Message sent!",
      description: "Thank you for your message. We'll get back to you soon.",
    });
    
    // Reset form
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main id="main-content" className="container-blog py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Contact ZetechVerse
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Have questions about the platform, need help, or want to suggest new features? We're here to help.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Send us a Message
                </CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Your full name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      name="subject"
                      type="text"
                      placeholder="What's this about?"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Tell us more about your inquiry..."
                      rows={6}
                      value={formData.message}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <Button type="submit" className="w-full">
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Contact Information
                  </CardTitle>
                <CardDescription>
                  Other ways to reach us
                </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start gap-4 rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Email</h3>
                      <p className="text-sm sm:text-base text-muted-foreground">info@zetechverse.com</p>
                      <p className="text-sm text-muted-foreground leading-6">
                        For platform inquiries and support
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Zetech University</h3>
                      <p className="text-sm sm:text-base text-muted-foreground">info@zetech.ac.ke</p>
                      <p className="text-sm text-muted-foreground leading-6">
                        For university-related inquiries
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Main Campus</h3>
                      <p className="text-sm sm:text-base text-muted-foreground">Ruiru, Kiambu County, Kenya</p>
                      <p className="text-sm text-muted-foreground leading-6">
                        Multiple campuses across Kenya
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-foreground mb-2">
                        How do I post items on the marketplace?
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Create an account and navigate to the Marketplace section. Click "Post Item" to list your product with photos and details.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-foreground mb-2">
                        Can companies post job opportunities?
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Yes! Companies and organizations can post internships and job opportunities in the Opportunities section.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-foreground mb-2">
                        Is the Confessions section anonymous?
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Yes, confessions are posted anonymously to encourage open sharing within the Zetech community.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-foreground mb-2">
                        How do I report inappropriate content?
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Use the report button on any post or contact us directly. We moderate content to maintain a positive community.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Contact;
