'use client';

import Link from 'next/link';
import { User, Calendar, ArrowRight } from 'lucide-react';
import { ImageWithFallback } from './image-with-fallback';

const blogPosts = [
  {
    title: 'consectetur, adipisci velit, sed quia non numquam eius',
    author: 'Admin',
    date: 'July 25, 2021',
    description: 'There are many variations of passages of Lorem Ipsum available, but the majority have suffered...',
  },
  {
    title: 'On the other hand, we denounce with righteous...',
    author: 'Admin',
    date: 'July 25, 2021',
    description: 'On the other hand, we denounce with righteous indignation and dislike men who are so beguiled...',
  },
  {
    title: 'At vero eos et accusamus et justo odio dignissimos...',
    author: 'Admin',
    date: 'July 25, 2021',
    description: 'At vero eos et accusamus et justo odio dignissimos ducimus qui blanditiis praesentium voluptatum...',
  },
];

export function Blog() {
  const blogImages = [
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80',
    'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=600&q=80',
    'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=600&q=80',
  ];

  return (
    <section id="blog" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Our Latest Blog</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {blogPosts.map((post, index) => (
            <div
              key={index}
              className="p-0 rounded-lg bg-background border hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              <div className="relative h-48 w-full">
                <ImageWithFallback
                  src={blogImages[index]}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                {/* Metadata */}
                <div className="flex items-center justify-between mb-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{post.author}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{post.date}</span>
                  </div>
                </div>
                
                {/* Title */}
                <h3 className="font-bold text-lg mb-3 line-clamp-2">{post.title}</h3>
                
                {/* Description */}
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {post.description}
                </p>
                
                {/* Read More Link */}
                <Link 
                  href="#blog" 
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1 font-medium"
                >
                  Read More
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
