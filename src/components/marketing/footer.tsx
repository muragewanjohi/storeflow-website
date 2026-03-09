import { Mail } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-gradient-to-br from-[#0025cc] to-[#001a99] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Company Info */}
          <div>
            <div className="mb-4">
              <img
                src="/logo_with_name.png"
                alt="DukaNest"
                className="h-10 w-auto object-contain brightness-0 invert"
              />
            </div>
            <p className="text-white/90 leading-relaxed mb-6">
              Build your dream online store with powerful tools and beautiful templates. No coding required.
            </p>
            {/* Social Icons */}
            <div className="flex gap-4">
              <a href="https://x.com/duka_nest" className="group w-10 h-10 bg-white/20 hover:bg-amber-400 backdrop-blur-sm rounded-lg flex items-center justify-center transition-colors">
                <svg className="w-5 h-5 text-white group-hover:text-[#001a99] transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>
              <a href="https://www.instagram.com/duka_nest/" target="_blank" rel="noopener noreferrer" className="group w-10 h-10 bg-white/20 hover:bg-amber-400 backdrop-blur-sm rounded-lg flex items-center justify-center transition-colors">
                <svg className="w-5 h-5 text-white group-hover:text-[#001a99] transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href="https://www.tiktok.com/@duka_nest" target="_blank" rel="noopener noreferrer" className="group w-10 h-10 bg-white/20 hover:bg-amber-400 backdrop-blur-sm rounded-lg flex items-center justify-center transition-colors">
                <svg className="w-5 h-5 text-white group-hover:text-[#001a99] transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/#features" className="text-white/90 hover:text-amber-400 transition-colors">Features</Link>
              </li>
              <li>
                <Link href="/#themes" className="text-white/90 hover:text-amber-400 transition-colors">Templates</Link>
              </li>
              <li>
                <Link href="/pricing" className="text-white/90 hover:text-amber-400 transition-colors">Pricing</Link>
              </li>
              <li>
                <Link href="/#why-ecommerce" className="text-white/90 hover:text-amber-400 transition-colors">Why Ecommerce</Link>
              </li>
              <li>
                <Link href="/help" className="text-white/90 hover:text-amber-400 transition-colors">Help Center</Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/contact" className="text-white/90 hover:text-amber-400 transition-colors">Contact</Link>
              </li>
              <li>
                <Link href="/#blog" className="text-white/90 hover:text-amber-400 transition-colors">Blog</Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="text-white/90 hover:text-amber-400 transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/terms-of-service" className="text-white/90 hover:text-amber-400 transition-colors">Terms of Service</Link>
              </li>
              <li>
                <Link href="/cookie-policy" className="text-white/90 hover:text-amber-400 transition-colors">Cookie Policy</Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Contact</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white/90">support@dukanest.com</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/90 text-sm">
              © 2026 DukaNest. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="/privacy-policy" className="text-white/90 hover:text-amber-400 text-sm transition-colors">Privacy Policy</Link>
              <Link href="/terms-of-service" className="text-white/90 hover:text-amber-400 text-sm transition-colors">Terms of Service</Link>
              <Link href="/cookie-policy" className="text-white/90 hover:text-amber-400 text-sm transition-colors">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

