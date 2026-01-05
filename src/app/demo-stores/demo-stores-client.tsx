/**
 * Demo Stores Client Component
 * 
 * Client component for displaying demo stores showcase
 */

'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { ExternalLink } from 'lucide-react';

interface DemoStore {
  id: string;
  name: string;
  subdomain: string;
  custom_domain: string | null;
  theme_slug: string | null;
  url: string;
  created_at: Date | null;
}

interface DemoStoresClientProps {
  demoStores: DemoStore[];
}

export default function DemoStoresClient({ demoStores }: Readonly<DemoStoresClientProps>) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Explore Our Demo Stores
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            See our platform in action with fully functional demo stores. 
            Browse products, explore themes, and experience the features firsthand.
          </p>
          <div className="mt-6">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              Demo stores are read-only and reset daily
            </Badge>
          </div>
        </div>

        {/* Demo Stores Grid */}
        {demoStores.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                No demo stores available at the moment.
              </p>
              <p className="text-sm text-muted-foreground">
                Demo stores are created by platform administrators to showcase features.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {demoStores.map((store) => (
              <Card key={store.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="mb-2">{store.name}</CardTitle>
                      <CardDescription>
                        {store.theme_slug ? (
                          <Badge variant="outline" className="mt-1">
                            {store.theme_slug}
                          </Badge>
                        ) : (
                          'Default Theme'
                        )}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="bg-purple-500 text-white">
                      Demo
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Store URL:</p>
                      <code className="text-xs bg-muted px-2 py-1 rounded block truncate">
                        {store.url}
                      </code>
                    </div>
                    <Button
                      asChild
                      className="w-full"
                      variant="default"
                    >
                      <a
                        href={store.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Visit Demo Store
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <Card className="max-w-2xl mx-auto bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800">
            <CardContent className="py-8">
              <h2 className="text-2xl font-bold mb-4">Ready to Create Your Own Store?</h2>
              <p className="text-muted-foreground mb-6">
                Start your free trial today and build your online store in minutes.
              </p>
              <Button asChild size="lg">
                <Link href="/pricing">
                  Get Started
                  <ArrowRightIcon className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

