import { Calendar, User, Tag } from 'lucide-react';

const blogPosts = [
  {
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',
    title: 'Sed do eiusmod tempor incididunt ut labore et…',
    excerpt: 'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Quis ipsum suspendisse ultrices…',
    author: 'Admin',
    date: 'July 25, 2021',
    category: 'Business'
  },
  {
    image: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=800&q=80',
    title: 'Ut enim ad minim veniam, quis nostrud…',
    excerpt: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo…',
    author: 'Admin',
    date: 'July 25, 2021',
    category: 'Technology'
  },
  {
    image: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&q=80',
    title: 'On the other hand, we denounce with righteous…',
    excerpt: 'On the other hand, we denounce with righteous indignation and dislike men who are so beguiled…',
    author: 'Admin',
    date: 'July 25, 2021',
    category: 'International'
  },
  {
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    title: 'At vero eos et accusamus et iusto odio dignissimos…',
    excerpt: 'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum…',
    author: 'Admin',
    date: 'July 25, 2021',
    category: 'Lifestyle'
  }
];

export function Blog() {
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
          {blogPosts.map((post, index) => (
            <div
              key={index}
              className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden"
            >
              {/* Post Image */}
              <div className="relative h-48 bg-[#e7e9eb] overflow-hidden">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>

              {/* Post Meta */}
              <div className="relative -mt-6 mx-4 mb-4">
                <div className="bg-white rounded-full shadow-lg px-4 py-2 flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1 text-[#8d8d8d]">
                    <User className="w-3 h-3" />
                    <span>{post.author}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#8d8d8d]">
                    <Calendar className="w-3 h-3" />
                    <span>{post.date}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#0c0528]">
                    <Tag className="w-3 h-3 text-[#0025cc]" />
                    <span>{post.category}</span>
                  </div>
                </div>
              </div>

              {/* Post Content */}
              <div className="px-4 pb-6">
                <h3 className="text-lg font-semibold text-[#0c0528] mb-2 line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-sm text-[#8d8d8d] mb-4 line-clamp-2">
                  {post.excerpt}
                </p>
                <button className="text-[#0025cc] text-sm font-medium hover:underline">
                  Read More
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-12">
          <button className="bg-gradient-to-r from-[#0025cc] to-[#001a99] text-white px-8 py-4 rounded-lg hover:shadow-xl transform hover:-translate-y-1 transition-all">
            View All Posts
          </button>
        </div>
      </div>
    </section>
  );
}
