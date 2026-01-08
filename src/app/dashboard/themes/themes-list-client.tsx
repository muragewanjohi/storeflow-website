'use client';

/**
 * Themes List Client Component
 * 
 * Displays all available themes with preview and installation options
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Download, Eye, Sparkles, Edit } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Theme {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  author: string | null;
  version: string | null;
  is_premium: boolean | null;
  price: number | null;
  screenshot_url: string | null;
  theme_url: string | null;
  status: boolean | null;
  colors: Record<string, unknown> | null;
  typography: Record<string, unknown> | null;
}

interface CurrentTheme {
  theme: Theme | null;
  customizations: Record<string, unknown> | null;
}

export default function ThemesListClient() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [includeDemoContent, setIncludeDemoContent] = useState(false);

  // Fetch all themes
  const { data: themesData, isLoading: themesLoading } = useQuery({
    queryKey: ['themes'],
    queryFn: async () => {
      const response = await fetch('/api/themes');
      if (!response.ok) throw new Error('Failed to fetch themes');
      const data = await response.json();
      return data.themes as Theme[];
    },
  });

  // Fetch current active theme
  const { data: currentThemeData } = useQuery({
    queryKey: ['current-theme'],
    queryFn: async () => {
      const response = await fetch('/api/themes/current');
      if (!response.ok) throw new Error('Failed to fetch current theme');
      const data = await response.json() as CurrentTheme;
      return data;
    },
  });

  useEffect(() => {
    if (currentThemeData?.theme) {
      setActiveThemeId(currentThemeData.theme.id);
    }
  }, [currentThemeData]);

  // Install/activate theme mutation
  const installThemeMutation = useMutation({
    mutationFn: async ({ themeId, includeDemo }: { themeId: string; includeDemo: boolean }) => {
      const response = await fetch('/api/themes/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          theme_id: themeId,
          include_demo_content: includeDemo,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to install theme');
      }
      return response.json();
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['current-theme'] });
      setInstallDialogOpen(false);
      setIncludeDemoContent(false);
      
      // Build success message
      const messages: string[] = [];
      if (data.homepage_created) messages.push('Homepage created');
      if (data.additional_pages_created > 0) {
        messages.push(`${data.additional_pages_created} additional pages created`);
      }
      if (data.demo_content_created) {
        messages.push(`${data.demo_products_created} demo products and ${data.demo_categories_created} categories created`);
      }
      
      // If homepage was created, offer to edit it
      if (data.homepage_created) {
        // Fetch homepage ID
        try {
          const pagesResponse = await fetch('/api/pages?search=home&status=published&limit=1');
          if (pagesResponse.ok) {
            const pagesData = await pagesResponse.json();
            const homepage = pagesData.pages?.[0];
            
            if (homepage?.id) {
              toast.success('Theme installed! Homepage created.', {
                description: 'Would you like to customize your homepage?',
                action: {
                  label: 'Edit Homepage',
                  onClick: () => router.push(`/dashboard/pages/${homepage.id}/edit`),
                },
                duration: 8000,
              });
            } else {
              toast.success('Theme installed and homepage created successfully!', {
                description: 'You can customize it in Pages → Home',
                duration: 5000,
              });
            }
          } else {
            toast.success('Theme installed and homepage created successfully!', {
              description: 'You can customize it in Pages → Home',
              duration: 5000,
            });
          }
        } catch {
          toast.success('Theme installed and homepage created successfully!', {
            description: 'You can customize it in Pages → Home',
            duration: 5000,
          });
        }
      } else {
        toast.success('Theme activated successfully!');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to install theme');
    },
  });

  const handleInstallTheme = (themeId: string) => {
    // Check if this is a new installation (theme not currently active)
    const isNewInstall = activeThemeId !== themeId;
    
    if (isNewInstall) {
      // Show dialog for new installations
      setSelectedThemeId(themeId);
      setInstallDialogOpen(true);
    } else {
      // Direct install for re-activation (no demo content option)
      installThemeMutation.mutate({ themeId, includeDemo: false });
    }
  };

  const handleConfirmInstall = () => {
    if (selectedThemeId) {
      installThemeMutation.mutate({ 
        themeId: selectedThemeId, 
        includeDemo: includeDemoContent 
      });
    }
  };

  if (themesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading themes...</div>
      </div>
    );
  }

  const themes = themesData || [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Themes</h1>
        <p className="text-muted-foreground mt-2">
          Choose a theme for your storefront. You can customize colors, fonts, and layouts after installation.
        </p>
      </div>

      {currentThemeData?.theme && (
        <Card className="mb-6 border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Active Theme
                </CardTitle>
                <CardDescription className="mt-1">
                  {currentThemeData.theme.title} - {currentThemeData.theme.description || 'No description'}
                </CardDescription>
              </div>
              <Link href="/dashboard/themes/customize">
                <Button variant="outline">Customize</Button>
              </Link>
            </div>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {themes.map((theme: any) => {
          const isActive = activeThemeId === theme.id;
          const isInstalling = installThemeMutation.isPending && installThemeMutation.variables?.themeId === theme.id;

          return (
            <Card key={theme.id} className={isActive ? 'border-primary ring-2 ring-primary' : ''}>
              <div className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-muted">
                {theme.screenshot_url ? (
                  <Image
                    src={theme.screenshot_url}
                    alt={theme.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No preview available
                  </div>
                )}
                {isActive && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-primary">Active</Badge>
                  </div>
                )}
              </div>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {theme.title}
                      {theme.is_premium && (
                        <Sparkles className="h-4 w-4 text-yellow-500" />
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {theme.description || 'No description available'}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  {theme.author && <span>By {theme.author}</span>}
                  {theme.version && <span>• v{theme.version}</span>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {theme.is_premium && theme.price && (
                    <Badge variant="outline" className="font-semibold">
                      ${Number(theme.price).toFixed(2)}
                    </Badge>
                  )}
                  {!theme.is_premium && (
                    <Badge variant="secondary">Free</Badge>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="flex-1"
                >
                  <Link href={`/dashboard/themes/preview/${theme.id}`}>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Link>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleInstallTheme(theme.id)}
                  disabled={isActive || isInstalling}
                >
                  {isInstalling ? (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Installing...
                    </>
                  ) : isActive ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Active
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Install
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {themes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No themes available yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

