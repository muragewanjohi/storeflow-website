/**
 * Blog Listing Client Component
 * 
 * Client component for displaying blog posts list
 */

'use client';

import { Calendar, Tag } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface BlogPost {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  image: string | null;
  created_at: Date | null;
  blog_categories: {
    id: string;
    name: string;
    slug: string | null;
  } | null;
}

interface BlogListingClientProps {
  blogs: BlogPost[];
}

export default function BlogListingClient({ blogs }: Readonly<BlogListingClientProps>) {
  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (blogs.length === 0) {
    return (
      <div className="min-h-screen bg-white pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Blog</h1>
            <p className="text-muted-foreground">No blog posts available yet.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-primary font-medium mb-2">Our Blog</p>
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Latest{' '}
            <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Articles
            </span>
          </h1>
          <p className="text-muted-foreground">
            Stay updated with our latest news, tips, and insights
          </p>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogs.map((post) => (
            <Link
              key={post.id}
              href={
                post.slug
                  ? `/blog/${encodeURIComponent(post.slug)}`
                  : `/blog/${post.id}`
              }
              className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden border"
            >
              {/* Post Image */}
              <div className="relative h-64 bg-gray-100 overflow-hidden">
                {post.image ? (
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                    <Tag className="w-16 h-16 text-white opacity-50" />
                  </div>
                )}
              </div>

              {/* Post Meta */}
              <div className="relative -mt-6 mx-4 mb-4">
                <div className="bg-white rounded-full shadow-lg px-4 py-2 flex items-center gap-3 text-xs border">
                  <div className="flex items-center gap-1 text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(post.created_at)}</span>
                  </div>
                  {post.blog_categories && (
                    <div className="flex items-center gap-1 text-gray-900">
                      <Tag className="w-3 h-3 text-primary" />
                      <span>{post.blog_categories.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Post Content */}
              <div className="px-6 pb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p className="text-sm text-gray-500 mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>
                )}
                <span className="text-primary text-sm font-medium hover:underline">
                  Read More →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

