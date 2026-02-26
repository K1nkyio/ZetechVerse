import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BlogCard from '@/components/BlogCard';
import PageFilter, { Post } from '@/components/PageFilter';
import { useState } from 'react';
import techPost from '@/assets/tech-post.jpg';
import fashionLifestyle from '@/assets/fashion-lifestyle.jpg';

const Technology = () => {
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);

  const techPosts: Post[] = [];

  const postsToShow = filteredPosts.length > 0 ? filteredPosts : techPosts;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main id="main-content" className="container-blog py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Technology
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Stay ahead of the curve with the latest in technology trends, innovations, and digital transformation.
          </p>
        </div>

        <PageFilter
          posts={techPosts}
          onFilteredPostsChange={setFilteredPosts}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {postsToShow.map((post) => (
            <BlogCard
              key={post.slug}
              title={post.title}
              category={post.category}
              date={post.date}
              excerpt={post.excerpt}
              image={post.image}
              href={`/blog/${post.slug}`}
              isSmall={false}
            />
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Technology;