/**
 * HexFashion Theme Footer
 * 
 * Fashion-focused footer with social links
 * Day 37: Theme Templates
 */

'use client';

import Link from 'next/link';

export default function HexFashionFooter() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    shop: [
      { name: 'New Arrivals', href: '/products?sort=newest' },
      { name: 'Tops', href: '/products?category=tops' },
      { name: 'Bottoms', href: '/products?category=bottoms' },
      { name: 'Accessories', href: '/products?category=accessories' },
    ],
    customer: [
      { name: 'Size Guide', href: '/size-guide' },
      { name: 'Shipping', href: '/shipping' },
      { name: 'Returns', href: '/returns' },
      { name: 'Contact', href: '/contact' },
    ],
    about: [
      { name: 'Our Story', href: '/about' },
      { name: 'Sustainability', href: '/sustainability' },
      { name: 'Careers', href: '/careers' },
      { name: 'Press', href: '/press' },
    ],
  };

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <h3 className="text-2xl font-light tracking-wider mb-4">HEXFASHION</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Discover timeless fashion pieces crafted with care and attention to detail.
            </p>
            <div className="flex gap-4">
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <span className="sr-only">Instagram</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.46a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.242.636.41 1.363.46 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.46 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.242-1.363.41-2.427.46-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.46a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.242-.636-.41-1.363-.46-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.46-2.427a4.902 4.902 0 011.772-1.153 4.902 4.902 0 011.772-1.153c.636-.242 1.363-.41 2.427-.46C9.407 2.013 9.751 2 12.315 2zm-.081 1.802c-2.401 0-2.584.011-3.96.06-1.304.06-2.01.28-2.486.465a3.18 3.18 0 00-1.17.753 3.18 3.18 0 00-.753 1.17c-.184.476-.404 1.182-.465 2.486-.05 1.376-.06 1.559-.06 3.96v.081c0 2.401.011 2.584.06 3.96.06 1.304.28 2.01.465 2.486a3.18 3.18 0 00.753 1.17 3.18 3.18 0 001.17.753c.476.184 1.182.404 2.486.465 1.376.05 1.559.06 3.96.06h.081c2.401 0 2.584-.011 3.96-.06 1.304-.06 2.01-.28 2.486-.465a3.18 3.18 0 001.17-.753 3.18 3.18 0 00.753-1.17c.184-.476.404-1.182.465-2.486.05-1.376.06-1.559.06-3.96v-.081c0-2.401-.011-2.584-.06-3.96-.06-1.304-.28-2.01-.465-2.486a3.18 3.18 0 00-.753-1.17 3.18 3.18 0 00-1.17-.753c-.476-.184-1.182-.404-2.486-.465-1.376-.05-1.559-.06-3.96-.06h-.081z" />
                  <path d="M12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
                </svg>
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <span className="sr-only">Pinterest</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.372 0 12s5.373 12 12 12c5.302 0 9.917-3.158 11.827-7.69-.053-.127-.227-.423-.3-.69-.324-1.22-.402-1.69-.402-2.61 0-2.5 1.517-4.33 4.07-4.33 1.92 0 2.847 1.433 2.847 3.3 0 1.93-1.228 3.6-3.04 3.6-.93 0-1.62-.48-1.89-1.12 0 0-.46 1.75-.57 2.18-.2.78-.74 1.75-1.1 2.35-.66 1.12-1.33 2.25-1.9 3.1-.85 1.25-1.8 2.5-2.6 3.5-.2.25-.58.48-.85.48-.7 0-1.25-.9-1.25-2.1 0-1.8.95-3.1.95-3.1.47-.9.23-1.38-.23-2.2-.32-.6-.45-1.3-.45-2.1 0-2.8 1.7-5.4 4.9-5.4 2.6 0 4.6 1.9 4.6 4.4 0 2.6-1.6 4.8-4 4.8-.8 0-1.55-.4-1.8-.9 0 0-.4 1.5-.5 1.9-.18.7-.68 1.6-1.02 2.1-.5.8-1.1 1.6-1.6 2.2-.6.8-1.2 1.5-1.7 2.1-.2.25-.5.5-.8.5-.4 0-.7-.3-.7-.7 0-.4.1-.8.2-1.1.1-.3.2-.6.3-.9.2-.5.4-1 .6-1.5.1-.3.2-.6.3-.9.1-.3.2-.6.2-.9 0-.5-.2-1-.5-1.4-.3-.4-.7-.7-1.1-.7-.3 0-.6.1-.8.3-.2.2-.3.5-.3.8 0 .3.1.6.2.9.1.3.2.6.3.9.2.5.4 1 .6 1.5.1.3.2.6.3.9.1.3.2.7.2 1.1 0 .4-.3.7-.7.7-.3 0-.6-.25-.8-.5-.5-.6-1.1-1.4-1.6-2.2-.34-.5-.84-1.4-1.02-2.1-.1-.4-.5-1.9-.5-1.9-.25.5-1 .9-1.8.9-2.4 0-4-2.2-4-4.8 0-2.5 2-4.4 4.6-4.4 3.2 0 4.9 2.6 4.9 5.4 0 .8-.13 1.5-.45 2.1-.46.82-.46 1.3-.23 2.2 0 0 .95 1.3.95 3.1 0 1.2-.55 2.1-1.25 2.1-.27 0-.65-.23-.85-.48-.8-1-1.75-2.25-2.6-3.5-.57-.85-1.24-1.98-1.9-3.1-.36-.6-.9-1.57-1.1-2.35-.11-.43-.57-2.18-.57-2.18-.27.64-1.02 1.12-1.89 1.12-1.812 0-3.04-1.67-3.04-3.6 0-1.867.927-3.3 2.847-3.3 2.553 0 4.07 1.83 4.07 4.33 0 .92-.078 1.39-.402 2.61-.073.267-.247.563-.3.69C2.083 8.842 6.698 12 12 12c6.627 0 12-5.372 12-12S18.627 0 12 0z" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-sm font-light tracking-wide uppercase mb-4">Shop</h4>
            <ul className="space-y-3">
              {footerLinks.shop.map((link: any) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer */}
          <div>
            <h4 className="text-sm font-light tracking-wide uppercase mb-4">Customer</h4>
            <ul className="space-y-3">
              {footerLinks.customer.map((link: any) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div>
            <h4 className="text-sm font-light tracking-wide uppercase mb-4">About</h4>
            <ul className="space-y-3">
              {footerLinks.about.map((link: any) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 border-t pt-8">
          <p className="text-center text-sm text-muted-foreground font-light">
            © {currentYear} HEXFASHION. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

