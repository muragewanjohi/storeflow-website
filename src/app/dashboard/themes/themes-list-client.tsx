'use client';

/**
 * Themes List Client Component
 * 
 * Displays all available themes with preview and installation options
 */

import { useState, useEffect } from 'react';
import React from 'react';
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
  const [installedThemes, setInstalledThemes] = useState<Record<string, boolean>>({});
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [includeDemoContent, setIncludeDemoContent] = useState(false);
  const [includeDemoAttributes, setIncludeDemoAttributes] = useState(false);

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

  // Fetch all installed themes (active and inactive)
  const { data: installedThemesData } = useQuery({
    queryKey: ['installed-themes'],
    queryFn: async () => {
      const response = await fetch('/api/themes/installed');
      if (!response.ok) throw new Error('Failed to fetch installed themes');
      const data = await response.json();
      return data.installedThemes as Record<string, boolean>;
    },
  });

  useEffect(() => {
    if (currentThemeData?.theme) {
      setActiveThemeId(currentThemeData.theme.id);
    }
  }, [currentThemeData]);

  useEffect(() => {
    if (installedThemesData) {
      setInstalledThemes(installedThemesData);
    }
  }, [installedThemesData]);

  // Install/activate theme mutation
  const installThemeMutation = useMutation({
    mutationFn: async ({ themeId, includeDemo, includeAttributes }: { themeId: string; includeDemo: boolean; includeAttributes: boolean }) => {
      const response = await fetch('/api/themes/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          theme_id: themeId,
          include_demo_content: includeDemo,
          include_demo_attributes: includeAttributes,
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
      queryClient.invalidateQueries({ queryKey: ['installed-themes'] });
      // Invalidate all queries to refresh lists
      queryClient.invalidateQueries();
      // Force router refresh to update server components
      router.refresh();
      setInstallDialogOpen(false);
      setIncludeDemoContent(false);
      setIncludeDemoAttributes(false);
      
      // Build success message
      const messages: string[] = [];
      if (data.homepage_created) messages.push('Homepage created');
      if (data.additional_pages_created > 0) {
        messages.push(`${data.additional_pages_created} additional pages created`);
      }
      if (data.demo_content_created) {
        const contentParts: string[] = [];
        if (data.demo_products_created > 0) {
          contentParts.push(`${data.demo_products_created} product${data.demo_products_created !== 1 ? 's' : ''}`);
        }
        if (data.demo_categories_created > 0) {
          contentParts.push(`${data.demo_categories_created} categor${data.demo_categories_created !== 1 ? 'ies' : 'y'}`);
        }
        if (data.demo_attributes_created > 0) {
          contentParts.push(`${data.demo_attributes_created} attribute${data.demo_attributes_created !== 1 ? 's' : ''}`);
        }
        if (contentParts.length > 0) {
          messages.push(`Demo content: ${contentParts.join(', ')} created`);
        }
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
        // Theme was switched (already installed, just activated)
        toast.success('Theme switched successfully!', {
          description: 'Your storefront is now using this theme.',
          duration: 5000,
        });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to install theme');
    },
  });

  const handleInstallTheme = (themeId: string) => {
    const isActive = activeThemeId === themeId;
    const isInstalled = installedThemes[themeId] !== undefined;
    const isNewInstall = !isInstalled;
    
    if (isActive) {
      // Theme is already active, do nothing (button should be disabled)
      return;
    }
    
    if (isNewInstall) {
      // Show dialog for new installations (with demo content option)
      setSelectedThemeId(themeId);
      setInstallDialogOpen(true);
    } else {
      // Theme is installed but not active - switch to it (no demo content option)
      installThemeMutation.mutate({ themeId, includeDemo: false, includeAttributes: false });
    }
  };

  const handleConfirmInstall = () => {
    if (selectedThemeId) {
      installThemeMutation.mutate({ 
        themeId: selectedThemeId, 
        includeDemo: includeDemoContent,
        includeAttributes: includeDemoAttributes,
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
          const isInstalled = installedThemes[theme.id] !== undefined;
          const isInstalling = installThemeMutation.isPending && installThemeMutation.variables?.themeId === theme.id;
          
          // Determine button text and icon
          let buttonText = 'Install';
          let ButtonIcon = Download;
          if (isActive) {
            buttonText = 'Active';
            ButtonIcon = CheckCircle2;
          } else if (isInstalled) {
            buttonText = 'Switch';
            ButtonIcon = Download;
          }

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
                      {isInstalled ? 'Switching...' : 'Installing...'}
                    </>
                  ) : (
                    <>
                      <ButtonIcon className="h-4 w-4 mr-2" />
                      {buttonText}
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

      {/* Install Theme Dialog */}
      <Dialog open={installDialogOpen} onOpenChange={setInstallDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Install Theme</DialogTitle>
            <DialogDescription>
              Would you like to install this theme with demo content? This will create sample products and categories to help you get started.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="demo-content"
                checked={includeDemoContent}
                onCheckedChange={(checked) => {
                  setIncludeDemoContent(checked === true);
                  if (!checked) {
                    setIncludeDemoAttributes(false); // Uncheck attributes if demo content is unchecked
                  }
                }}
              />
              <label
                htmlFor="demo-content"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Install with demo content (products & categories)
              </label>
            </div>
            {includeDemoContent && (
              <div className="flex items-center space-x-2 pl-6">
                <Checkbox
                  id="demo-attributes"
                  checked={includeDemoAttributes}
                  onCheckedChange={(checked) => setIncludeDemoAttributes(checked === true)}
                />
                <label
                  htmlFor="demo-attributes"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Include demo attributes (Size, Color, etc.)
                </label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInstallDialogOpen(false)}
              disabled={installThemeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmInstall}
              disabled={installThemeMutation.isPending || !selectedThemeId}
            >
              {installThemeMutation.isPending ? 'Installing...' : 'Install Theme'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

