'use client';

import Link from 'next/link';
import { MapPin } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer id="contact" className="py-12 px-4 sm:px-6 lg:px-8 border-t bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-semibold mb-4">About Us</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-foreground transition-colors">Work Portfolio</Link></li>
              <li><Link href="#about" className="hover:text-foreground transition-colors">About us</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Team</Link></li>
              <li><Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Services</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-foreground transition-colors">Web Design</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Ui/Ux Design</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">App Development</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Game Development</Link></li>
            </ul>
          </div>
          <div className="col-span-2">
            <h3 className="font-semibold mb-4">Our Address</h3>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p>Unit 4, The Courtyard, Lynton Road, Crouch End N8 8SL</p>
            </div>
          </div>
        </div>
        <div className="pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} All right reserved By DukaNest</p>
        </div>
      </div>
    </footer>
  );
}
