// SEO utility functions for meta tags, structured data, and sitemap generation

export interface MetaTags {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  ogType?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
}

export interface StructuredData {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

export interface ArticleStructuredData extends StructuredData {
  '@type': 'Article' | 'NewsArticle' | 'BlogPosting';
  headline: string;
  description: string;
  image: string | string[];
  author: {
    '@type': 'Person';
    name: string;
  };
  publisher: {
    '@type': 'Organization';
    name: string;
    logo: {
      '@type': 'ImageObject';
      url: string;
    };
  };
  datePublished: string;
  dateModified: string;
}

export interface BreadcrumbStructuredData extends StructuredData {
  '@type': 'BreadcrumbList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item?: string;
  }>;
}

export class SeoUtils {
  /**
   * Generate meta tags for a page
   */
  static generateMetaTags(tags: MetaTags): HTMLMetaElement[] {
    const metaElements: HTMLMetaElement[] = [];

    // Basic meta tags
    if (tags.title) {
      this.createOrUpdateMetaTag('title', tags.title);
    }

    if (tags.description) {
      this.createOrUpdateMetaTag('meta', tags.description, 'description');
    }

    if (tags.keywords) {
      this.createOrUpdateMetaTag('meta', tags.keywords, 'keywords');
    }

    // Open Graph tags
    if (tags.ogTitle) {
      this.createOrUpdateMetaTag('meta', tags.ogTitle, 'property', 'og:title');
    }

    if (tags.ogDescription) {
      this.createOrUpdateMetaTag('meta', tags.ogDescription, 'property', 'og:description');
    }

    if (tags.ogImage) {
      this.createOrUpdateMetaTag('meta', tags.ogImage, 'property', 'og:image');
    }

    if (tags.ogUrl) {
      this.createOrUpdateMetaTag('meta', tags.ogUrl, 'property', 'og:url');
    }

    if (tags.ogType) {
      this.createOrUpdateMetaTag('meta', tags.ogType, 'property', 'og:type');
    }

    // Twitter Card tags
    if (tags.twitterCard) {
      this.createOrUpdateMetaTag('meta', tags.twitterCard, 'name', 'twitter:card');
    }

    if (tags.twitterTitle) {
      this.createOrUpdateMetaTag('meta', tags.twitterTitle, 'name', 'twitter:title');
    }

    if (tags.twitterDescription) {
      this.createOrUpdateMetaTag('meta', tags.twitterDescription, 'name', 'twitter:description');
    }

    if (tags.twitterImage) {
      this.createOrUpdateMetaTag('meta', tags.twitterImage, 'name', 'twitter:image');
    }

    // Additional meta tags
    if (tags.author) {
      this.createOrUpdateMetaTag('meta', tags.author, 'author');
    }

    if (tags.publishedTime) {
      this.createOrUpdateMetaTag('meta', tags.publishedTime, 'article:published_time');
    }

    if (tags.modifiedTime) {
      this.createOrUpdateMetaTag('meta', tags.modifiedTime, 'article:modified_time');
    }

    if (tags.tags) {
      tags.tags.forEach(tag => {
        this.createOrUpdateMetaTag('meta', tag, 'article:tag');
      });
    }

    // Canonical URL
    if (tags.canonical) {
      this.createOrUpdateLinkTag('canonical', tags.canonical);
    }

    return metaElements;
  }

  /**
   * Create or update a meta tag
   */
  static createOrUpdateMetaTag(tagName: 'title' | 'meta', content: string, attribute?: string, value?: string): void {
    if (tagName === 'title') {
      document.title = content;
      return;
    }

    let metaTag: HTMLMetaElement | null;

    if (attribute === 'property') {
      metaTag = document.querySelector(`meta[property="${value}"]`) as HTMLMetaElement;
    } else if (attribute === 'name') {
      metaTag = document.querySelector(`meta[name="${value}"]`) as HTMLMetaElement;
    } else {
      metaTag = document.querySelector(`meta[${attribute}]`) as HTMLMetaElement;
    }

    if (!metaTag) {
      metaTag = document.createElement('meta');
      if (attribute === 'property') {
        metaTag.setAttribute('property', value!);
      } else if (attribute === 'name') {
        metaTag.setAttribute('name', value!);
      } else {
        metaTag.setAttribute(attribute!, content);
      }
      document.head.appendChild(metaTag);
    }

    metaTag.content = content;
  }

  /**
   * Create or update a link tag
   */
  static createOrUpdateLinkTag(rel: string, href: string): void {
    let linkTag = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;

    if (!linkTag) {
      linkTag = document.createElement('link');
      linkTag.rel = rel;
      document.head.appendChild(linkTag);
    }

    linkTag.href = href;
  }

  /**
   * Generate structured data JSON-LD script tag
   */
  static generateStructuredData(data: StructuredData): void {
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }

  /**
   * Generate article structured data
   */
  static generateArticleStructuredData(articleData: Omit<ArticleStructuredData, '@context'>): void {
    const structuredData: ArticleStructuredData = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      ...articleData
    };

    this.generateStructuredData(structuredData);
  }

  /**
   * Generate breadcrumb structured data
   */
  static generateBreadcrumbStructuredData(breadcrumbData: Omit<BreadcrumbStructuredData, '@context'>): void {
    const structuredData: BreadcrumbStructuredData = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      ...breadcrumbData
    };

    this.generateStructuredData(structuredData);
  }

  /**
   * Generate sitemap data (client-side utility)
   */
  static generateSitemap(pages: Array<{ url: string; lastmod?: string; priority?: number; changefreq?: string }>): string {
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
    const urlsetStart = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    const urlsetEnd = '</urlset>';

    const urls = pages.map(page => {
      return `
    <url>
      <loc>${page.url}</loc>
      ${page.lastmod ? `<lastmod>${page.lastmod}</lastmod>` : ''}
      ${page.priority !== undefined ? `<priority>${page.priority}</priority>` : ''}
      ${page.changefreq ? `<changefreq>${page.changefreq}</changefreq>` : ''}
    </url>`;
    }).join('');

    return `${xmlHeader}${urlsetStart}${urls}${urlsetEnd}`;
  }

  /**
   * Update meta tags for a specific page
   */
  static updatePageMeta(title: string, description: string, additionalTags?: Partial<MetaTags>): void {
    const tags: MetaTags = {
      title: `${title} - ZetechVerse`,
      description,
      canonical: window.location.href,
      ogTitle: title,
      ogDescription: description,
      ogUrl: window.location.href,
      ogType: 'website',
      ...additionalTags
    };

    this.generateMetaTags(tags);
  }
}

// React hook-like function for use in components
export const useSeo = (title: string, description: string, additionalTags?: Partial<MetaTags>) => {
  // This would typically be used in a React component
  SeoUtils.updatePageMeta(title, description, additionalTags);
};

export default SeoUtils;