import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { authService } from '@/services/auth.service';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { provider } = useParams<{ provider: string }>();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const runOAuthCallback = async () => {
      const resolvedProvider = provider === 'google' || provider === 'github' ? provider : null;
      const code = searchParams.get('code');
      const state = searchParams.get('state') || undefined;
      const errorCode = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (errorCode) {
        setError(errorDescription || `OAuth sign-in failed: ${errorCode}`);
        return;
      }

      if (!resolvedProvider || !code) {
        setError('Missing OAuth callback data. Please try signing in again.');
        return;
      }

      try {
        await authService.oauthCallback(resolvedProvider, code, state);
        navigate('/dashboard', { replace: true });
      } catch (oauthError: any) {
        setError(oauthError?.message || 'Failed to complete OAuth sign-in.');
      }
    };

    void runOAuthCallback();
  }, [navigate, provider, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-border/50 backdrop-blur-sm bg-card/90">
            <CardHeader className="text-center space-y-2">
              <CardTitle>Completing sign-in</CardTitle>
              <CardDescription>We are verifying your account details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error ? (
                <>
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                  <Button asChild className="w-full">
                    <Link to="/login">Back to login</Link>
                  </Button>
                </>
              ) : (
                <div className="flex items-center justify-center text-muted-foreground py-2">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Finalizing OAuth authentication...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AuthCallback;
