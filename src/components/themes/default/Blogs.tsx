/**
 * Default Theme Blogs Section
 * 
 * Blog posts section with computer/electronics focus
 */

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar, User } from 'lucide-react';
import { usePreview } from '@/lib/themes/preview-context';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  author: string;
  date: string;
  category: string;
}

interface DefaultBlogsProps {
  posts?: BlogPost[];
}

const defaultPosts: BlogPost[] = [
  {
    id: '1',
    title: 'Top 10 Laptops for 2024: Ultimate Buying Guide',
    excerpt: 'Discover the best laptops for work, gaming, and creativity. Our comprehensive guide covers performance, battery life, and value.',
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=600&fit=crop',
    author: 'Tech Expert',
    date: '2024-01-15',
    category: 'Laptops',
  },
  {
    id: '2',
    title: 'Building Your Perfect Gaming Setup',
    excerpt: 'Learn how to create the ultimate gaming station with the right monitors, keyboards, and accessories for peak performance.',
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=600&fit=crop',
    author: 'Gaming Pro',
    date: '2024-01-10',
    category: 'Gaming',
  },
  {
    id: '3',
    title: 'Monitor Buying Guide: 4K vs 1440p vs 1080p',
    excerpt: 'Understanding monitor resolutions and which one is right for your needs. We break down the differences and help you choose.',
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&h=600&fit=crop',
    author: 'Display Specialist',
    date: '2024-01-05',
    category: 'Monitors',
  },
];

export default function DefaultBlogs({ posts = defaultPosts }: DefaultBlogsProps) {
  const { isPreview, onNavigate } = usePreview();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{ fontFamily: 'var(--font-heading, inherit)' }}
            >
              Latest Blog Posts
            </h2>
            <p className="text-xl text-muted-foreground">
              Stay updated with the latest tech news and buying guides
            </p>
          </div>
          {isPreview && onNavigate ? (
            <Button
              variant="outline"
              size="lg"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/blog');
              }}
            >
              View All Posts <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button variant="outline" size="lg" asChild>
              <a href="/blog">
                View All Posts <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <Card key={post.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300">
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-primary text-primary-foreground text-sm font-semibold rounded-full">
                    {post.category}
                  </span>
                </div>
              </div>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
                <p className="text-muted-foreground mb-4 line-clamp-3">
                  {post.excerpt}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{post.author}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(post.date)}</span>
                  </div>
                </div>
                {isPreview && onNavigate ? (
                  <Button
                    variant="ghost"
                    className="w-full group/btn"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate(`/blog/${post.id}`);
                    }}
                  >
                    Read More
                    <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                ) : (
                  <Button variant="ghost" className="w-full group/btn" asChild>
                    <a href={`/blog/${post.id}`}>
                      Read More
                      <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

