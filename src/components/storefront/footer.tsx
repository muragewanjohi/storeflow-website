/**
 * Storefront Footer Component
 * 
 * Footer for customer-facing storefront pages
 * Currently shows only copyright section - can be customized later
 */

'use client';

export default function StorefrontFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Copyright */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            © {currentYear} DukaNest. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

