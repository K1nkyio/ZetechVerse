import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroSection from '@/components/home/HeroSection';
import FeaturedPosts from '@/components/home/FeaturedPosts';
import TrendingTopics from '@/components/home/TrendingTopics';
import UpcomingEvents from '@/components/home/UpcomingEvents';
import MarketplaceHighlights from '@/components/home/MarketplaceHighlights';
import OpportunitiesPreview from '@/components/home/OpportunitiesPreview';
import { useTranslation } from 'react-i18next';

const Index = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="px-3 sm:px-4">
        <HeroSection />
        <div className="max-w-7xl mx-auto px-0 sm:px-4">
          <p className="text-muted-foreground mb-4 sm:mb-6 max-w-3xl mx-auto text-center px-4 text-base sm:text-lg leading-relaxed">
            {t('home.tagline')}
          </p>
        </div>
        <div className="max-w-7xl mx-auto px-0 sm:px-4">
          <FeaturedPosts />
        </div>
        <div className="max-w-7xl mx-auto px-0 sm:px-4 py-8 sm:py-12 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          <TrendingTopics />
          <UpcomingEvents />
        </div>
        <div className="max-w-7xl mx-auto px-0 sm:px-4">
          <MarketplaceHighlights />
        </div>
        <div className="max-w-7xl mx-auto px-0 sm:px-4">
          <OpportunitiesPreview />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
