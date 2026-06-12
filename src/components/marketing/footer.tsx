import { Mail } from 'lucide-react';
import Link from 'next/link';
import { PlayStoreBadge } from './play-store-badge';

export function Footer() {
  return (
    <footer className="text-white" style={{ background: 'linear-gradient(135deg, #0B33B7 0%, #082a94 100%)' }}>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <img
              src="/logo_with_name.png"
              alt="DukaNest"
              className="mb-4 h-10 w-auto object-contain brightness-0 invert"
            />
            <p className="mb-6 max-w-sm leading-relaxed text-white/90">
              Build your dream online store with powerful tools and beautiful templates. No coding required.
            </p>
            <PlayStoreBadge variant="dark" size="md" />
            <div className="mt-6 flex gap-4">
              <a href="https://x.com/duka_nest" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 transition-colors hover:bg-white/30">
                <span className="sr-only">X</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
              </a>
              <a href="https://www.instagram.com/duka_nest/" target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 transition-colors hover:bg-white/30">
                <span className="sr-only">Instagram</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a href="https://www.tiktok.com/@duka_nest" target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 transition-colors hover:bg-white/30">
                <span className="sr-only">TikTok</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold">Products</h3>
            <ul className="space-y-3">
              <li><Link href="/#features" className="text-white/90 transition-colors hover:text-white">Features</Link></li>
              <li><Link href="/#pricing" className="text-white/90 transition-colors hover:text-white">Pricing</Link></li>
              <li><Link href="/#mobile-app" className="text-white/90 transition-colors hover:text-white">Mobile App</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold">Resources</h3>
            <ul className="space-y-3">
              <li><Link href="/#faq" className="text-white/90 transition-colors hover:text-white">FAQ</Link></li>
              <li><Link href="/help" className="text-white/90 transition-colors hover:text-white">Help Center</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold">Company</h3>
            <ul className="space-y-3">
              <li><Link href="/#about" className="text-white/90 transition-colors hover:text-white">About</Link></li>
              <li><Link href="/contact" className="text-white/90 transition-colors hover:text-white">Contact</Link></li>
            </ul>
            <h3 className="mb-4 mt-8 text-lg font-semibold">Legal</h3>
            <ul className="space-y-3">
              <li><Link href="/privacy-policy" className="text-white/90 transition-colors hover:text-white">Privacy Policy</Link></li>
              <li><Link href="/terms-of-service" className="text-white/90 transition-colors hover:text-white">Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/20 pt-8 md:flex-row">
          <p className="text-sm text-white/90">© 2026 DukaNest. All rights reserved.</p>
          <a href="mailto:support@dukanest.com" className="flex items-center gap-2 text-sm text-white/90 hover:text-white">
            <Mail className="h-4 w-4" />
            support@dukanest.com
          </a>
        </div>
      </div>
    </footer>
  );
}
