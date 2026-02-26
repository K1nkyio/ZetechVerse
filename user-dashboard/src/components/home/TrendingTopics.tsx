import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, MessageCircle, Heart, Loader2 } from 'lucide-react';
import { confessionsApi, type Confession } from '@/api/confessions.api';

const TrendingTopics = () => {
  const [trendingTopics, setTrendingTopics] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrendingTopics();
  }, []);

  const fetchTrendingTopics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch approved confessions and rank by engagement + freshness.
      const response = await confessionsApi.getConfessions({
        status: 'approved',
        sort_by: 'likes_count',
        sort_order: 'DESC',
        limit: 20
      });

      const trending = response.confessions
        .map((confession) => {
          const createdAt = new Date(confession.created_at).getTime();
          const hoursSincePost = Math.max(1, (Date.now() - createdAt) / (1000 * 60 * 60));
          const engagementScore = (confession.likes_count * 3) + (confession.comments_count * 2);
          const recencyBoost = Math.max(0, 48 - hoursSincePost) * 0.3;

          return {
            confession,
            score: engagementScore + recencyBoost
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((entry) => entry.confession);

      setTrendingTopics(trending);
    } catch (err: any) {
      console.error('Failed to fetch trending topics:', err);
      setError('Failed to load trending topics');
      setTrendingTopics([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Trending Now</h2>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="h-6 w-6 bg-muted rounded animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse"></div>
                <div className="h-3 bg-muted rounded animate-pulse w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-xl font-bold">Trending Now</h2>
          <p className="text-sm text-muted-foreground">Popular confessions and discussions among students</p>
        </div>
      </div>

      <div className="space-y-4">
        {error ? (
          <div className="text-center py-4">
            <p className="text-destructive">{error}</p>
            <button 
              onClick={fetchTrendingTopics}
              className="mt-2 text-sm text-primary hover:underline"
            >
              Try Again
            </button>
          </div>
        ) : trendingTopics.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No trending topics available.</p>
        ) : (
          trendingTopics.map((topic, index) => (
            <Link
              key={topic.id}
              to={`/confessions?highlight=${topic.id}`}
              className="flex items-start gap-4 group"
            >
              <span className="text-2xl font-bold text-muted-foreground/50 group-hover:text-primary transition-colors">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium group-hover:text-primary transition-colors line-clamp-2">
                  {topic.content.substring(0, 100)}{topic.content.length > 100 ? '...' : ''}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="text-primary capitalize">{topic.category_name || 'General'}</span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    {topic.comments_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {topic.likes_count}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default TrendingTopics;
