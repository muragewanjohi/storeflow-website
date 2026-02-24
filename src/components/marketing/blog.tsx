'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Calendar, User, Tag } from 'lucide-react';
import Link from 'next/link';

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

export function Blog() {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBlogs() {
      try {
        // Fetch marketing blogs (blogs with special marketing tenant_id)
        const response = await fetch('/api/marketing/blogs?limit=4&sort_by=created_at&sort_order=desc');
        if (response.ok) {
          const data = await response.json();
          setBlogPosts(data.blogs || []);
        } else {
          setError('Failed to load blogs');
        }
      } catch (err) {
        console.error('Error fetching blogs:', err);
        setError('Failed to load blogs');
      } finally {
        setIsLoading(false);
      }
    }

    fetchBlogs();
  }, []);

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <section id="blog" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-muted-foreground">Loading blogs...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error || blogPosts.length === 0) {
    return null; // Don't show section if no blogs
  }
  return (
    <section id="blog" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-[#0025cc] font-medium mb-2">Read Our News</p>
          <h2 className="text-4xl lg:text-5xl font-bold text-[#0c0528] mb-4">
            Our Latest{' '}
            <span className="bg-gradient-to-r from-[#0025cc] to-[#001a99] bg-clip-text text-transparent">
              Blog Post
            </span>
          </h2>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {blogPosts.map((post) => (
            <a
              key={post.id}
              href="/help"
              className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden"
            >
              {/* Post Image */}
              <div className="relative h-48 bg-[#e7e9eb] overflow-hidden">
                {post.image ? (
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#0025cc] to-[#001a99] flex items-center justify-center">
                    <Tag className="w-12 h-12 text-white opacity-50" />
                  </div>
                )}
              </div>

              {/* Post Meta */}
              <div className="relative -mt-6 mx-4 mb-4">
                <div className="bg-white rounded-full shadow-lg px-4 py-2 flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1 text-[#8d8d8d]">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(post.created_at)}</span>
                  </div>
                  {post.blog_categories && (
                  <div className="flex items-center gap-1 text-[#0c0528]">
                    <Tag className="w-3 h-3 text-[#0025cc]" />
                      <span>{post.blog_categories.name}</span>
                  </div>
                  )}
                </div>
              </div>

              {/* Post Content */}
              <div className="px-4 pb-6">
                <h3 className="text-lg font-semibold text-[#0c0528] mb-2 line-clamp-2">
                  {post.title}
                </h3>
                {post.excerpt && (
                <p className="text-sm text-[#8d8d8d] mb-4 line-clamp-2">
                  {post.excerpt}
                </p>
                )}
                <span className="text-[#0025cc] text-sm font-medium hover:underline">
                  Read More
                </span>
              </div>
            </a>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-12">
          <Link
            href="/help"
            className="inline-block bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white px-8 py-4 rounded-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
          >
            Visit Help Center
          </Link>
        </div>
      </div>
    </section>
  );
}
