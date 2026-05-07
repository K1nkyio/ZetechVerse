import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, ArrowLeft, User, Mail, Lock, Shield, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useTranslation } from 'react-i18next';

const ALLOWED_ZETECH_EMAIL_DOMAINS = ['zetech.ac.ke', 'student.zetech.ac.ke'];

const isAllowedZetechEmail = (value: string) => {
  const domain = value.trim().toLowerCase().split('@').pop();
  return Boolean(domain && ALLOWED_ZETECH_EMAIL_DOMAINS.includes(domain));
};

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { register } = useAuth();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: '',
  });
  const hasEmailValue = email.trim().length > 0;
  const emailDomainInvalid = hasEmailValue && !isAllowedZetechEmail(email);

  const checkPasswordStrength = (pwd: string) => {
    let score = 0;
    const feedback: string[] = [];

    if (pwd.length >= 8) score += 1;
    else feedback.push(t('auth.register.passwordRuleLength'));

    if (/[a-z]/.test(pwd)) score += 1;
    else feedback.push(t('auth.register.passwordRuleLower'));

    if (/[A-Z]/.test(pwd)) score += 1;
    else feedback.push(t('auth.register.passwordRuleUpper'));

    if (/\d/.test(pwd)) score += 1;
    else feedback.push(t('auth.register.passwordRuleNumber'));

    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    else feedback.push(t('auth.register.passwordRuleSpecial'));

    const strengthLabels = [
      t('auth.register.veryWeak'),
      t('auth.register.weak'),
      t('auth.register.fair'),
      t('auth.register.good'),
      t('auth.register.strong'),
    ];

    return {
      score,
      feedback:
        feedback.length > 0
          ? `${t('auth.register.passwordMissing')}: ${feedback.join(', ')}`
          : `${t('auth.register.passwordStrength')}: ${strengthLabels[score]}`,
    };
  };

  const handlePasswordChange = (pwd: string) => {
    setPassword(pwd);
    setPasswordStrength(checkPasswordStrength(pwd));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !username || !password || !confirmPassword) {
      setError(t('auth.register.fillRequiredFields'));
      return;
    }

    if (!isAllowedZetechEmail(email)) {
      setError(t('auth.register.emailDomainRule'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.register.passwordsNoMatch'));
      return;
    }

    if (passwordStrength.score < 4) {
      setError(t('auth.register.passwordRequirementsMissing'));
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError(t('auth.register.usernameRule'));
      return;
    }

    if (username.length < 3 || username.length > 30) {
      setError(t('auth.register.usernameLengthRule'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await register({
        email,
        username,
        password,
        full_name: fullName || undefined,
      });

      toast({
        title: t('auth.successTitle'),
        description: t('auth.register.successDescription'),
      });

      navigate('/marketplace', { replace: true });
    } catch (err: any) {
      const validationMessage = Array.isArray(err?.errors)
        ? err.errors.map((item: any) => item?.msg || item?.message).filter(Boolean).join(', ')
        : '';
      const errorMessage = validationMessage || err.message || t('auth.register.failedDescription');
      setError(errorMessage);
      toast({
        title: t('auth.register.failedTitle'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-6 sm:py-8">
        <div className="w-full max-w-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4 sm:mb-5 hover:bg-secondary/50 transition-colors h-9"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('auth.register.goBack')}
          </Button>

          <Card className="shadow-xl border-border/50 backdrop-blur-sm bg-card/90">
            <CardHeader className="space-y-1 text-center pb-5 px-5 pt-6">
              <div className="mx-auto bg-primary/10 p-2.5 rounded-full w-12 h-12 flex items-center justify-center mb-3">
                <User className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl font-bold">{t('auth.register.title')}</CardTitle>
              <CardDescription className="text-muted-foreground text-sm">
                {t('auth.register.description')}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 px-5 pb-6">
              {error && (
                <Alert variant="destructive" className="animate-in slide-in-from-top-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium">
                    <User className="h-4 w-4 inline mr-2" />
                    {t('auth.register.fullName')} <span className="text-muted-foreground font-normal">({t('auth.register.optional')})</span>
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                    className="h-10 px-3 text-sm transition-all duration-200 focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    <Mail className="h-4 w-4 inline mr-2" />
                    {t('auth.emailAddress')}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@student.zetech.ac.ke"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className={`h-10 px-3 text-sm transition-all duration-200 focus:ring-2 focus:ring-primary/30 ${
                      emailDomainInvalid ? 'border-destructive focus-visible:ring-destructive/30' : ''
                    }`}
                    required
                  />
                  <p className={`text-xs ${emailDomainInvalid ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {emailDomainInvalid ? t('auth.register.emailDomainRule') : t('auth.register.emailDomainHint')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium">
                    <User className="h-4 w-4 inline mr-2" />
                    {t('auth.register.username')}
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="johndoe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    className="h-10 px-3 text-sm transition-all duration-200 focus:ring-2 focus:ring-primary/30"
                    required
                  />
                  <p className="text-xs text-muted-foreground">{t('auth.register.usernameHint')}</p>
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
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      disabled={loading}
                      className="h-10 px-3 pr-10 text-sm transition-all duration-200 focus:ring-2 focus:ring-primary/30"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          passwordStrength.score <= 2
                            ? 'bg-red-500'
                            : passwordStrength.score === 3
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs mt-1 text-muted-foreground">{passwordStrength.feedback}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">
                    <Shield className="h-4 w-4 inline mr-2" />
                    {t('auth.register.confirmPassword')}
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="********"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      className="h-10 px-3 pr-10 text-sm transition-all duration-200 focus:ring-2 focus:ring-primary/30"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                      aria-label={showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-500">{t('auth.register.passwordsNoMatch')}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 text-sm font-medium mt-3 shadow-md hover:shadow-lg transition-shadow"
                  disabled={loading || emailDomainInvalid || passwordStrength.score < 4 || password !== confirmPassword}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('auth.register.creating')}
                    </>
                  ) : (
                    t('auth.register.createAccount')
                  )}
                </Button>
              </form>

              <div className="relative pt-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/30"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-card text-muted-foreground">{t('auth.register.alreadyHaveAccount')}</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full h-10 text-sm border-border/50 hover:bg-secondary/50 transition-colors"
                onClick={() => navigate('/login')}
                disabled={loading}
              >
                {t('auth.login.signIn')}
              </Button>

              <div className="pt-2 text-center">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('auth.register.agreePrefix')}{' '}
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

export default Register;
