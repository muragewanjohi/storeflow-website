/**
 * Minimal Theme Footer
 * 
 * Ultra-minimal footer
 */

'use client';

export default function MinimalFooter() {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <p className="text-xs font-light tracking-widest uppercase text-muted-foreground">
            © {new Date().getFullYear()} Store. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

