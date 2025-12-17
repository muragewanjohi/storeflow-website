'use client';

import { Button } from '@/components/ui/button';
import { Mail, Phone } from 'lucide-react';

export function Newsletter() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
      <div className="container mx-auto max-w-4xl text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-4">
          Get Updates as soon as they happen.
        </h2>
        <p className="text-xl text-muted-foreground mb-8">
          Signup now for our newsletter and app launch.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
          <input
            type="email"
            placeholder="Enter your email"
            className="flex-1 px-4 py-3 rounded-lg border bg-background"
          />
          <Button size="lg">Subscribe</Button>
        </div>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span>example@dukanest.com</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            <span>+1 (555) 123-4567</span>
          </div>
        </div>
      </div>
    </section>
  );
}
