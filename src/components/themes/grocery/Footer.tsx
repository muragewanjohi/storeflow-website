/**
 * Grocery Theme Footer
 * 
 * Multi-column footer with grocery store information
 */

'use client';

import Link from 'next/link';
import { usePreview } from '@/lib/themes/preview-context';

export default function GroceryFooter() {
  const { isPreview, onNavigate } = usePreview();

  const handleLinkClick = (url: string, e: React.MouseEvent) => {
    if (isPreview && onNavigate) {
      e.preventDefault();
      onNavigate(url);
    }
  };

  return (
    <footer className="bg-gray-900 text-gray-300 mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Grocery Store</h3>
            <p className="text-sm leading-relaxed">
              Fresh, organic, and high-quality groceries delivered to your door. Enjoy the best local produce, everyday essentials, and specialty items with ease!
            </p>
          </div>

          {/* Useful Links */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Useful Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                {isPreview && onNavigate ? (
                  <button
                    onClick={(e) => handleLinkClick('/about', e)}
                    className="hover:text-green-400 transition-colors"
                  >
                    About Us
                  </button>
                ) : (
                  <Link href="/about" className="hover:text-green-400 transition-colors">
                    About Us
                  </Link>
                )}
              </li>
              <li>
                {isPreview && onNavigate ? (
                  <button
                    onClick={(e) => handleLinkClick('/contact', e)}
                    className="hover:text-green-400 transition-colors"
                  >
                    Contact Us
                  </button>
                ) : (
                  <Link href="/contact" className="hover:text-green-400 transition-colors">
                    Contact Us
                  </Link>
                )}
              </li>
              <li>
                {isPreview && onNavigate ? (
                  <button
                    onClick={(e) => handleLinkClick('/page/privacy-policy', e)}
                    className="hover:text-green-400 transition-colors"
                  >
                    Privacy Policy
                  </button>
                ) : (
                  <Link href="/page/privacy-policy" className="hover:text-green-400 transition-colors">
                    Privacy Policy
                  </Link>
                )}
              </li>
              <li>
                {isPreview && onNavigate ? (
                  <button
                    onClick={(e) => handleLinkClick('/blog', e)}
                    className="hover:text-green-400 transition-colors"
                  >
                    Blog
                  </button>
                ) : (
                  <Link href="/blog" className="hover:text-green-400 transition-colors">
                    Blog
                  </Link>
                )}
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Contact Us</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="tel:+1234567890" className="hover:text-green-400 transition-colors">
                  +1 (234) 567-890
                </a>
              </li>
              <li>
                <a href="mailto:support@grocery.com" className="hover:text-green-400 transition-colors">
                  support@grocery.com
                </a>
              </li>
              <li>123 Main Street, City, State 12345</li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Subscribe Us</h3>
            <p className="text-sm mb-4">
              Subscribe for fresh organic updates, exclusive offers, and healthy living tips—delivered to your inbox!
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter Email Address"
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
              />
              <button className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors font-semibold">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          <p>Copyright © {new Date().getFullYear()} Grocery Store. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
