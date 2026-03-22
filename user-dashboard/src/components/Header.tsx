import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ThemeToggle from './ThemeToggle';
import ProfileDropdown from './ProfileDropdown';
import { NotificationBell } from './notifications/NotificationBell';
import { CartWishlistControls } from './CartWishlistControls';
import { trackEvent } from '@/lib/analytics';
import { upsertRecent } from '@/lib/storage';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '@/contexts/auth-context';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthContext();

  const navItems = [
    { key: 'header.nav.home', href: '/' },
    { key: 'header.nav.explore', href: '/explore' },
    { key: 'header.nav.marketplace', href: '/marketplace' },
    { key: 'header.nav.opportunities', href: '/opportunities' },
    { key: 'header.nav.confessions', href: '/confessions' },
    { key: 'header.nav.events', href: '/events' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const query = searchQuery.trim();
      upsertRecent('zv:recent-searches', query, 8);
      trackEvent('header_search_submit', { query, from: location.pathname });
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/76 shadow-[0_18px_40px_-30px_hsl(var(--foreground)/0.45)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/72 dark:border-white/10 dark:bg-background/58 dark:shadow-[0_18px_40px_-30px_rgba(0,0,0,0.9)]">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm sm:text-lg">Z</span>
            </div>
            <span className="text-lg sm:text-xl font-display font-semibold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              <span className="hidden sm:inline">ZetechVerse</span>
              <span className="sm:hidden">ZV</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1" role="navigation" aria-label="Main navigation">
            {navItems.map((item) => (
              <Link
                key={item.key}
                to={item.href}
                className={`px-3 sm:px-4 py-2 rounded-full text-sm font-sans font-semibold tracking-[0.01em] transition-all duration-200 ${
                  isActive(item.href)
                    ? 'bg-foreground text-background shadow-sm dark:bg-primary dark:text-primary-foreground'
                    : 'text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground dark:hover:bg-white/10'
                }`}
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center">
            <div className="group relative flex h-9 items-center rounded-full border border-border/75 bg-background/70 px-2.5 shadow-[inset_0_1px_0_hsl(var(--background)/0.65)] transition-all duration-200 focus-within:border-primary/45 focus-within:bg-background focus-within:shadow-md dark:border-white/10 dark:bg-white/5 lg:w-52 md:w-44">
              <Search className="h-3.5 w-3.5 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                type="text"
                placeholder={t('header.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-full w-full border-0 bg-transparent px-2.5 py-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                aria-label={t('header.searchAria')}
              />
              <kbd className="hidden lg:inline-flex h-5 min-w-5 items-center justify-center rounded bg-background/90 px-1 text-[10px] font-medium text-muted-foreground border border-border/60 dark:border-white/10 dark:bg-white/5">
                /
              </kbd>
            </div>
          </form>

          {/* Header Controls - Desktop */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? <NotificationBell /> : null}
            {isAuthenticated ? <CartWishlistControls wishlistFirst /> : null}
            <ThemeToggle />
            <ProfileDropdown />
          </div>

          {/* Mobile Header Controls */}
          <div className="flex md:hidden items-center gap-1">
            {isAuthenticated ? <NotificationBell /> : null}
            {isAuthenticated ? <CartWishlistControls wishlistFirst /> : null}
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={t('header.toggleMenuAria')}
              className="h-9 w-9 rounded-full"
            >
              {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden fixed top-14 sm:top-16 left-0 right-0 border-b border-border/70 bg-background/88 shadow-[0_16px_40px_-28px_hsl(var(--foreground)/0.5)] backdrop-blur-xl dark:border-white/10 dark:bg-background/84 z-50 animate-in slide-in-from-top-2">
            <div className="max-h-[calc(100vh-3.5rem)] sm:max-h-[calc(100vh-4rem)] overflow-y-auto">
              <div className="py-3 sm:py-4">
                {/* Mobile Search */}
                <form onSubmit={handleSearch} className="px-3 sm:px-4 mb-3 sm:mb-4">
                  <div className="group relative flex h-10 items-center rounded-full border border-border/75 bg-background/70 px-3 transition-all duration-200 focus-within:border-primary/40 focus-within:bg-background dark:border-white/10 dark:bg-white/5">
                    <Search className="h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      type="text"
                      placeholder={t('header.searchArticlesPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-full w-full border-0 bg-transparent px-2.5 py-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      aria-label={t('header.searchAria')}
                    />
                  </div>
                </form>

                {/* Notifications for Mobile */}
                <div className="px-3 sm:px-4 mb-3 sm:mb-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-sans font-medium text-muted-foreground">
                      {isAuthenticated ? t('header.quickAccess') : 'Account'}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <ProfileDropdown onCloseMenu={() => setIsMenuOpen(false)} />
                    </div>
                  </div>
                </div>

                <nav className="flex flex-col gap-1 px-3 sm:px-4" role="navigation" aria-label="Mobile navigation">
                  {navItems.map((item) => (
                    <Link
                      key={item.key}
                      to={item.href}
                      className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-sm font-sans font-semibold tracking-[0.01em] transition-all ${
                        isActive(item.href)
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {t(item.key)}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

    </header>
  );
};

export default Header;
