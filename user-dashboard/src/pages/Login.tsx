import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { useAuth, useOAuth, usePassword } from '@/hooks/use-auth';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from 'react-i18next';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { login, isAuthenticated } = useAuth();
  const { oauthLoading, oauthError, handleOAuthLogin } = useOAuth();
  const { forgotPassword, passwordLoading, passwordSuccess, passwordError } = usePassword();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const from = useMemo(() => location.state?.from?.pathname || '/marketplace', [location.state]);

  if (isAuthenticated) {
    navigate(from, { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError(t('auth.login.fillAllFields'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await login({
        email,
        password,
        remember_me: rememberMe,
      });

      toast({
        title: t('auth.successTitle'),
        description: t('auth.login.successDescription'),
      });

      navigate(from, { replace: true });
    } catch (err: any) {
      const errorMessage = err.message || t('auth.login.failedDescription');
      setError(errorMessage);
      toast({
        title: t('auth.login.failedTitle'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!forgotEmail) {
      toast({
        title: t('auth.errorTitle'),
        description: t('auth.login.enterEmail'),
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await forgotPassword(forgotEmail);
      toast({
        title: t('auth.successTitle'),
        description: t('auth.login.resetSent'),
      });

      // Development helper: backend can return a direct reset link when email delivery is not configured.
      if (result?.resetLink) {
        const resetUrl = new URL(result.resetLink);
        const token = resetUrl.searchParams.get('token');
        if (token) {
          navigate(`/reset-password?token=${encodeURIComponent(token)}`);
          return;
        }
      }

      setShowForgotPassword(false);
      setForgotEmail('');
    } catch (err: any) {
      toast({
        title: t('auth.errorTitle'),
        description: err.message || t('auth.login.resetFailed'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-6 sm:py-8">
        <div className="w-full max-w-sm">
          <Card className="shadow-xl border-border/50 backdrop-blur-sm bg-card/90">
            <CardHeader className="space-y-1 text-center pb-5 px-5 pt-6">
              <div className="mx-auto bg-primary/10 p-2.5 rounded-full w-12 h-12 flex items-center justify-center mb-3">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl font-bold">{t('auth.login.title')}</CardTitle>
              <CardDescription className="text-muted-foreground text-sm">
                {t('auth.login.description')}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 px-5 pb-6">
              {error && (
                <Alert variant="destructive" className="animate-in slide-in-from-top-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {oauthError && (
                <Alert variant="destructive" className="animate-in slide-in-from-top-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{oauthError}</AlertDescription>
                </Alert>
              )}

              {passwordError && (
                <Alert variant="destructive" className="animate-in slide-in-from-top-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{passwordError}</AlertDescription>
                </Alert>
              )}

              {passwordSuccess && (
                <Alert variant="default" className="border-green-500 animate-in slide-in-from-top-2">
                  <AlertCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-500">{passwordSuccess}</AlertDescription>
                </Alert>
              )}

              {showForgotPassword ? (
                <form onSubmit={handleForgotPassword} className="space-y-3 animate-in fade-in-0 zoom-in-95">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email" className="text-sm font-medium">
                      <Mail className="h-4 w-4 inline mr-2" />
                      {t('auth.emailAddress')}
                    </Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="your@email.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      disabled={passwordLoading}
                      className="h-10 px-3 text-sm"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full h-10 text-sm font-medium" disabled={passwordLoading}>
                    {passwordLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('auth.login.sendingReset')}
                      </>
                    ) : (
                      t('auth.login.sendResetEmail')
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full h-10 text-sm"
                    onClick={() => setShowForgotPassword(false)}
                    disabled={passwordLoading}
                  >
                    {t('auth.login.backToLogin')}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      <Mail className="h-4 w-4 inline mr-2" />
                      {t('auth.emailAddress')}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      className="h-10 px-3 text-sm transition-all duration-200 focus:ring-2 focus:ring-primary/30"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      <Lock className="h-4 w-4 inline mr-2" />
                      {t('auth.password')}
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="********"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        className="h-10 px-3 pr-10 text-sm transition-all duration-200 focus:ring-2 focus:ring-primary/30"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between pt-1 gap-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                        className="rounded-sm"
                      />
                      <Label
                        htmlFor="remember"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {t('auth.login.rememberMe')}
                      </Label>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                      disabled={loading}
                    >
                      {t('auth.login.forgotPassword')}
                    </button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-10 text-sm font-medium mt-3 shadow-md hover:shadow-lg transition-shadow"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('auth.login.signingIn')}
                      </>
                    ) : (
                      t('auth.login.signIn')
                    )}
                  </Button>
                </form>
              )}

              {!showForgotPassword && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border/30"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-3 bg-card text-muted-foreground">{t('auth.login.orContinueWith')}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        void handleOAuthLogin('google');
                      }}
                      disabled={oauthLoading || loading}
                      className="h-10 text-sm border-border/50 hover:bg-secondary/50 transition-colors"
                    >
                      {oauthLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      )}
                      Google
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        void handleOAuthLogin('github');
                      }}
                      disabled={oauthLoading || loading}
                      className="h-10 text-sm border-border/50 hover:bg-secondary/50 transition-colors"
                    >
                      {oauthLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                      )}
                      GitHub
                    </Button>
                  </div>

                  <div className="relative pt-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border/30"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-3 bg-card text-muted-foreground">{t('auth.login.noAccount')}</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full h-10 text-sm border-border/50 hover:bg-secondary/50 transition-colors"
                    onClick={() => navigate('/register')}
                    disabled={loading}
                  >
                    <User className="h-4 w-4 mr-2" />
                    {t('auth.login.createAccount')}
                  </Button>
                </>
              )}

              <div className="pt-2 text-center">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('auth.login.agreePrefix')}{' '}
                  <button type="button" onClick={() => navigate('/terms')} className="text-primary hover:underline">
                    {t('auth.terms')}
                  </button>
                  {' '}{t('auth.and')}{' '}
                  <button type="button" onClick={() => navigate('/privacy')} className="text-primary hover:underline">
                    {t('auth.privacy')}
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Login;
