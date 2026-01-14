/**
 * Blog Post Client Component
 * 
 * Client component for displaying a single blog post
 */

'use client';

import { Calendar, Tag, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface BlogCategory {
  id: string;
  name: string;
  slug: string | null;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string | null;
  content: string | null;
  excerpt: string | null;
  image: string | null;
  created_at: string | Date | null;
  updated_at: string | Date | null;
  meta_title: string | null;
  meta_description: string | null;
  blog_categories: BlogCategory | null;
}

interface BlogPostClientProps {
  blog: BlogPost;
  relatedBlogs: BlogPost[];
}

export default function BlogPostClient({ blog, relatedBlogs }: Readonly<BlogPostClientProps>) {
  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A';
    // Handle both string (from server) and Date (fallback) formats
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Back Button */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Blog</span>
        </Link>

        {/* Blog Post Header */}
        <article>
          <header className="mb-8">
            {blog.blog_categories && (
              <div className="mb-4">
                <Link
                  href={`/blog?category=${blog.blog_categories.slug || blog.blog_categories.id}`}
                  className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
                >
                  <Tag className="w-4 h-4" />
                  <span className="text-sm font-medium">{blog.blog_categories.name}</span>
                </Link>
              </div>
            )}

            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              {blog.title}
            </h1>

            <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(blog.created_at)}</span>
              </div>
            </div>

            {blog.excerpt && (
              <p className="text-xl text-gray-500 leading-relaxed mb-8">
                {blog.excerpt}
              </p>
            )}
          </header>

          {/* Featured Image */}
          {blog.image && (
            <div className="relative w-full h-96 mb-8 rounded-2xl overflow-hidden bg-gray-100">
              <Image
                src={blog.image}
                alt={blog.title || 'Blog post image'}
                fill
                className="object-cover"
                priority
                unoptimized
              />
            </div>
          )}

          {/* Blog Content */}
          <div className="prose prose-lg max-w-none">
            {blog.content ? (
              <div
                className="blog-content"
                dangerouslySetInnerHTML={{ __html: blog.content }}
              />
            ) : (
              <p className="text-gray-500">No content available.</p>
            )}
          </div>
        </article>

        {/* Related Blogs */}
        {relatedBlogs.length > 0 && (
          <section className="mt-16 pt-12 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">
              Related Articles
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedBlogs.map((relatedPost) => (
                <Link
                  key={relatedPost.id}
                  href={relatedPost.slug ? `/blog/${relatedPost.slug}` : `/blog/${relatedPost.id}`}
                  className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
                >
                  {relatedPost.image && (
                    <div className="relative h-40 bg-gray-100 overflow-hidden">
                      <Image
                        src={relatedPost.image}
                        alt={relatedPost.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {relatedPost.title}
                    </h3>
                    {relatedPost.excerpt && (
                      <p className="text-sm text-gray-500 line-clamp-2">
                        {relatedPost.excerpt}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
    </div>
  );
}

