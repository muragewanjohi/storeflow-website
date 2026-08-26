/**
 * Furniture Theme Footer
 * 
 * Footer component matching Figma design for Furniro furniture theme
 */

'use client';

import Link from 'next/link';

export default function FurnitureFooter() {
  return (
    <footer className="furniture-footer bg-white border-t border-[rgba(0,0,0,0.17)]">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <h3 className="text-[24px] font-bold text-black mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Furniro.
            </h3>
            <p className="text-[16px] text-[#9f9f9f] leading-normal" style={{ fontFamily: 'Poppins, sans-serif' }}>
              400 University Drive Suite 200 Coral Gables,<br />
              FL 33134 USA
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-[16px] font-medium text-[#9f9f9f] mb-4 uppercase tracking-[3px]" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Links
            </h4>
            <ul className="space-y-3">
              {['Home', 'Shop', 'About', 'Contact'].map((link) => (
                <li key={link}>
                  <Link
                    href={link === 'Home' ? '/' : `/${link.toLowerCase()}`}
                    className="text-[16px] font-medium text-black hover:text-[var(--color-primary)] transition-colors"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  >
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="text-[16px] font-medium text-[#9f9f9f] mb-4 uppercase tracking-[3px]" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Help
            </h4>
            <ul className="space-y-3">
              {['Payment Options', 'Returns', 'Privacy Policies'].map((link) => (
                <li key={link}>
                  <Link
                    href={`/${link.toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-[16px] font-medium text-black hover:text-[var(--color-primary)] transition-colors"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  >
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-[16px] font-medium text-[#9f9f9f] mb-4 uppercase tracking-[3px]" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Newsletter
            </h4>
            <form className="space-y-3">
              <input
                type="email"
                placeholder="Enter Your Email Address"
                className="w-full px-0 py-2 border-b border-[rgba(0,0,0,0.1)] focus:outline-none focus:border-[var(--color-primary)] text-[14px] text-[#9f9f9f]"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              />
              <button
                type="submit"
                className="text-[14px] font-medium text-black hover:text-[var(--color-primary)] transition-colors border-b border-transparent hover:border-[var(--color-primary)]"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                SUBSCRIBE
              </button>
            </form>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-[rgba(0,0,0,0.1)] pt-6">
          <p className="text-[16px] text-black text-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
            2023 furino. All rights reverved
          </p>
        </div>
      </div>
    </footer>
  );
}

