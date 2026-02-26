import {
  ArrowRight,
  Sparkles,
  ShoppingBag,
  Briefcase,
  MessageCircle,
  Calendar,
  TrendingUp,
  Users,
  BookOpen
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '@/contexts/auth-context';
import heroImage from '@/assets/zetech-campus-hero.jpg';

const HeroSection = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuthContext();
  const displayName = (user?.full_name?.trim() || user?.username?.trim() || 'there').split(/\s+/)[0];
  const [isDesktop, setIsDesktop] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isDesktop) {
      setScrollOffset(0);
      return;
    }

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        setScrollOffset(Math.min(window.scrollY, 360));
        ticking = false;
      });
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isDesktop]);

  const quickLinks = useMemo(
    () => [
      {
        icon: ShoppingBag,
        label: t('header.nav.marketplace'),
        desc: t('hero.quick.marketplace'),
        href: '/marketplace',
        color: 'bg-primary/10 text-primary',
      },
      {
        icon: Briefcase,
        label: t('header.nav.opportunities'),
        desc: t('hero.quick.opportunities'),
        href: '/opportunities',
        color: 'bg-accent/10 text-accent',
      },
      {
        icon: MessageCircle,
        label: t('header.nav.confessions'),
        desc: t('hero.quick.confessions'),
        href: '/confessions',
        color: 'bg-success/10 text-success',
      },
      {
        icon: Calendar,
        label: t('header.nav.events'),
        desc: t('hero.quick.events'),
        href: '/events',
        color: 'bg-secondary/10 text-secondary',
      },
    ],
    [t]
  );

  const heroBackgroundStyle = {
    backgroundImage: `url(${heroImage})`,
    backgroundPosition: isDesktop ? `center calc(35% + ${scrollOffset * 0.04}px)` : 'center 35%',
    backgroundSize: 'cover',
    transform: isDesktop ? `scale(${1 + scrollOffset * 0.0002})` : 'scale(1)',
    transformOrigin: 'center center',
  } as const;

  const ctaFocusClass =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/60';

  return (
    <section
      className="relative -mx-3 sm:-mx-4 overflow-hidden border-b border-border/70"
    >
      <div className="absolute inset-0 pointer-events-none will-change-transform" style={heroBackgroundStyle} />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black/70 via-black/45 to-black/25" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/45 via-black/30 to-background/95" />

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -left-8 h-64 w-64 rounded-full bg-primary/8 blur-3xl animate-float" />
        <div className="absolute top-20 right-0 h-72 w-72 rounded-full bg-accent/8 blur-3xl animate-float" style={{ animationDelay: '-2.5s' }} />
        <div className="absolute bottom-[-90px] left-1/3 h-72 w-72 rounded-full bg-primary/6 blur-3xl animate-pulse-glow" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.06)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.06)_1px,transparent_1px)] bg-[size:2.8rem_2.8rem]" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10 py-10 sm:py-14 lg:py-16">
        <div className="animate-slide-up mx-auto max-w-5xl text-center">
            <Badge className="mb-5 h-9 rounded-full border border-white/35 bg-black/45 px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              {isAuthenticated ? `Welcome back, ${displayName}` : t('hero.welcomeBadge')}
            </Badge>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.04] text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.55)]">
              {isAuthenticated ? `Welcome back, ${displayName}` : t('hero.titleLineOne')}
              <span className="block text-white/90">
                {isAuthenticated ? 'Continue where you left off' : t('hero.titleLineTwo')}
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-white/90 leading-relaxed [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
              {isAuthenticated
                ? 'Jump straight into your dashboard, latest notifications, and new opportunities across campus.'
                : t('hero.description')}
            </p>

            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              {isAuthenticated ? (
                <>
                  <Button size="lg" asChild className={`h-12 px-6 text-sm sm:text-base font-semibold shadow-md hover:shadow-lg transition-all ${ctaFocusClass}`}>
                    <Link to="/explore">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Continue to Explore
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild className={`h-12 px-6 text-sm sm:text-base font-semibold border-2 border-white/60 bg-black/20 text-white hover:bg-white/10 ${ctaFocusClass}`}>
                    <Link to="/notifications">
                      <Users className="mr-2 h-4 w-4" />
                      View notifications
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button size="lg" asChild className={`h-12 px-6 text-sm sm:text-base font-semibold shadow-md hover:shadow-lg transition-all ${ctaFocusClass}`}>
                    <Link to="/explore">
                      <BookOpen className="mr-2 h-4 w-4" />
                      {t('hero.startExploring')}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild className={`h-12 px-6 text-sm sm:text-base font-semibold border-2 border-white/60 bg-black/20 text-white hover:bg-white/10 ${ctaFocusClass}`}>
                    <Link to="/marketplace">
                      <Users className="mr-2 h-4 w-4" />
                      {t('hero.joinCommunity')}
                    </Link>
                  </Button>
                </>
              )}
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3 text-xs text-white/85 sm:text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/40 px-3 py-1.5 backdrop-blur-sm">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                {t('hero.dailyUpdates')}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/40 px-3 py-1.5 backdrop-blur-sm">
                <Users className="h-3.5 w-3.5 text-accent" />
                {t('hero.studentFirst')}
              </span>
            </div>

            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {quickLinks.map((item, idx) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className="group rounded-2xl border border-white/20 bg-black/35 p-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-black/45 hover:shadow-md"
                  style={{ animationDelay: `${100 + idx * 60}ms` }}
                >
                  <span className={`mb-3 inline-flex rounded-xl p-2.5 ${item.color}`}>
                    <item.icon className="h-4 w-4" />
                  </span>
                  <p className="font-display font-semibold tracking-tight text-white leading-tight">{item.label}</p>
                  <p className="mt-1 text-xs text-white/75 leading-snug">{item.desc}</p>
                </Link>
              ))}
            </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
};

export default HeroSection;
