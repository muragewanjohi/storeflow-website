'use client';

/**
 * Theme Customization Client Component
 * 
 * Allows customization of theme colors, fonts, and layouts
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Save, ArrowLeft, Upload, X, Sparkles, Download, Upload as UploadIcon, Code, Undo2, Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { useRef } from 'react';
import { THEME_COLOR_SETTINGS } from '@/lib/themes/color-settings';
import { FONT_OPTIONS, FONT_WEIGHTS } from '@/lib/themes/font-settings';
import { hasCustomCssAccess } from '@/lib/themes/theme-access';
import HomepageImagesTab from './homepage-images-tab';
import LiveThemePreview from './live-theme-preview';

interface ThemeColors {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  text?: string;
  muted?: string;
  [key: string]: string | undefined;
}

interface ThemeTypography {
  headingFont?: string;
  bodyFont?: string;
  baseFontSize?: number;
  headingWeight?: number;
  bodyWeight?: number;
}

interface ThemeLayout {
  header?: 'sticky' | 'static' | 'transparent';
  footer?: 'multi-column' | 'simple' | 'minimal';
  sidebar?: 'left' | 'right' | 'none';
  containerMaxWidth?: number;
}

interface CurrentTheme {
  theme: {
    id: string;
    title: string;
    slug: string;
    colors: ThemeColors | null;
    typography: ThemeTypography | null;
  } | null;
  customizations: {
    custom_colors?: ThemeColors;
    custom_fonts?: ThemeTypography;
    custom_layouts?: ThemeLayout;
    custom_css?: string;
    logo_url?: string;
    favicon_url?: string;
    meta_title?: string;
    meta_description?: string;
    meta_keywords?: string;
    social_links?: Record<string, unknown>;
  } | null;
}

export default function ThemeCustomizeClient({
  currentPlanName,
}: Readonly<{ currentPlanName: string | null }>) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const canUseCustomCss = hasCustomCssAccess(currentPlanName);

  // Fetch current theme and customizations
  const { data: currentThemeData, isLoading } = useQuery({
    queryKey: ['current-theme'],
    queryFn: async () => {
      const response = await fetch('/api/themes/current');
      if (!response.ok) throw new Error('Failed to fetch current theme');
      return await response.json() as CurrentTheme;
    },
  });

  // Form state
  const [customColors, setCustomColors] = useState<ThemeColors>({});
  const [customFonts, setCustomFonts] = useState<ThemeTypography>({});
  const [aiStylePrompt, setAiStylePrompt] = useState('');
  const [aiStyleUrl, setAiStyleUrl] = useState('');
  const [customLayouts, setCustomLayouts] = useState<ThemeLayout>({});
  const [customCss, setCustomCss] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const faviconFileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Store initial values for cancel/undo functionality
  const [initialValues, setInitialValues] = useState<{
    colors: ThemeColors;
    fonts: ThemeTypography;
    layouts: ThemeLayout;
    css: string;
    logoUrl: string;
    faviconUrl: string;
    metaTitle: string;
    metaDescription: string;
  } | null>(null);

  // Initialize form with current customizations
  useEffect(() => {
    if (currentThemeData) {
      const customizations = currentThemeData.customizations || {};
      const initial = {
        colors: customizations.custom_colors || {},
        fonts: customizations.custom_fonts || {},
        layouts: customizations.custom_layouts || {},
        css: customizations.custom_css || '',
        logoUrl: customizations.logo_url || '',
        faviconUrl: customizations.favicon_url || '',
        metaTitle: customizations.meta_title || '',
        metaDescription: customizations.meta_description || '',
      };
      
      // Store initial values
      setInitialValues(initial);
      
      // Set form state
      setCustomColors(initial.colors);
      setCustomFonts(initial.fonts);
      setCustomLayouts(initial.layouts);
      setCustomCss(initial.css);
      setLogoUrl(initial.logoUrl);
      setFaviconUrl(initial.faviconUrl);
      setMetaTitle(initial.metaTitle);
      setMetaDescription(initial.metaDescription);
    }
  }, [currentThemeData]);

  // Update theme customizations mutation
  const updateMutation = useMutation({
    mutationFn: async (data: {
      custom_colors?: ThemeColors;
      custom_fonts?: ThemeTypography;
      custom_layouts?: ThemeLayout;
      custom_css?: string;
      logo_url?: string;
      favicon_url?: string;
      meta_title?: string;
      meta_description?: string;
    }) => {
      const response = await fetch('/api/themes/current', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update theme');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-theme'] });
      toast.success('Theme customizations saved successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save customizations');
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      custom_colors: customColors,
      custom_fonts: customFonts,
      custom_layouts: customLayouts,
      // Non-Pro tenants never get to type into the Custom CSS field (it's
      // locked in the UI below), but guard here too so a save can never
      // accidentally submit CSS text this tenant isn't entitled to save.
      custom_css: canUseCustomCss ? customCss : '',
      logo_url: logoUrl,
      favicon_url: faviconUrl,
      meta_title: metaTitle,
      meta_description: metaDescription,
    });
  };

  const handleColorChange = (key: string, value: string) => {
    setCustomColors((prev) => ({ ...prev, [key]: value }));
  };

  // Theme Track B2.1 — AI-assisted styling from a free-text mood prompt.
  // Generate-then-preview only: populates the SAME customColors/customFonts
  // state the manual pickers and the live preview panel already read from,
  // so the merchant sees the AI suggestion rendered live before deciding to
  // Save (or tweak individual colors/fonts further) — nothing is persisted
  // by this mutation itself.
  const aiStyleMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await fetch('/api/themes/ai-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate a style');
      }
      return response.json() as Promise<{
        custom_colors: ThemeColors;
        custom_fonts: { headingFont: string; bodyFont: string; headingWeight: number; bodyWeight: number };
      }>;
    },
    onSuccess: (data) => {
      setCustomColors((prev) => ({ ...prev, ...data.custom_colors }));
      setCustomFonts((prev) => ({ ...prev, ...data.custom_fonts }));
      toast.success('Applied your AI-generated style — review it below, then Save to keep it.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate a style');
    },
  });

  const handleGenerateAiStyle = () => {
    const trimmed = aiStylePrompt.trim();
    if (!trimmed) {
      toast.error('Describe the mood or style you want first (e.g. "warm and earthy").');
      return;
    }
    aiStyleMutation.mutate(trimmed);
  };

  // Theme Track B2.2 — AI-assisted styling from a reference-site screenshot.
  // Same generate-then-preview contract as B2.1's aiStyleMutation above —
  // populates the same customColors/customFonts state, nothing persisted
  // until Save. Can genuinely take 10-20+ seconds (real headless-browser
  // capture + a Claude vision call), so the button below shows a real
  // "this takes a moment" note rather than looking stuck.
  const aiStyleFromUrlMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await fetch('/api/themes/ai-style-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate a style from that site');
      }
      return response.json() as Promise<{
        custom_colors: ThemeColors;
        custom_fonts: { headingFont: string; bodyFont: string; headingWeight: number; bodyWeight: number };
      }>;
    },
    onSuccess: (data) => {
      setCustomColors((prev) => ({ ...prev, ...data.custom_colors }));
      setCustomFonts((prev) => ({ ...prev, ...data.custom_fonts }));
      toast.success('Applied a style inspired by that site — review it below, then Save to keep it.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate a style from that site');
    },
  });

  const handleGenerateAiStyleFromUrl = () => {
    const trimmed = aiStyleUrl.trim();
    if (!trimmed) {
      toast.error('Enter a website URL first (e.g. "https://example.com").');
      return;
    }
    aiStyleFromUrlMutation.mutate(trimmed);
  };

  // Generate favicon from logo using Canvas API
  const generateFaviconFromLogo = async (logoUrl: string): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 32; // Favicon size
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Could not generate favicon'));
            return;
          }
          const file = new File([blob], 'favicon.png', { type: 'image/png' });
          resolve(file);
        }, 'image/png');
      };
      img.onerror = () => reject(new Error('Could not load logo image'));
      img.src = logoUrl;
    });
  };

  // Handle logo upload
  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      formData.append('type', 'logo');

      const response = await fetch('/api/themes/upload-branding', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload logo');
      }

      const data = await response.json();
      setLogoUrl(data.url);
      setLogoPreview(data.url);
      toast.success('Logo uploaded successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
  };

  // Handle favicon upload
  const handleFaviconUpload = async (file: File) => {
    setFaviconUploading(true);
    try {
      const formData = new FormData();
      formData.append('favicon', file);
      formData.append('type', 'favicon');

      const response = await fetch('/api/themes/upload-branding', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload favicon');
      }

      const data = await response.json();
      setFaviconUrl(data.url);
      setFaviconPreview(data.url);
      toast.success('Favicon uploaded successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload favicon');
    } finally {
      setFaviconUploading(false);
    }
  };

  // Generate favicon from logo
  const handleGenerateFavicon = async () => {
    if (!logoUrl) {
      toast.error('Please upload a logo first');
      return;
    }

    try {
      const faviconFile = await generateFaviconFromLogo(logoUrl);
      await handleFaviconUpload(faviconFile);
      toast.success('Favicon generated from logo successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate favicon from logo');
    }
  };

  // Export theme customizations
  const handleExport = async () => {
    try {
      const response = await fetch('/api/themes/export');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to export theme');
      }

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `theme-export-${data.theme.slug}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Theme exported successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to export theme');
    }
  };

  // Import theme customizations
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      if (!importData.theme || !importData.customizations) {
        throw new Error('Invalid import file format');
      }

      const response = await fetch('/api/themes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import theme');
      }

      // Reload theme data
      queryClient.invalidateQueries({ queryKey: ['current-theme'] });
      toast.success('Theme imported successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to import theme');
    } finally {
      // Reset file input
      if (importFileInputRef.current) {
        importFileInputRef.current.value = '';
      }
    }
  };

  // Handle cancel/undo - reset to initial values and navigate back
  const handleCancel = () => {
    if (initialValues) {
      setCustomColors(initialValues.colors);
      setCustomFonts(initialValues.fonts);
      setCustomLayouts(initialValues.layouts);
      setCustomCss(initialValues.css);
      setLogoUrl(initialValues.logoUrl);
      setFaviconUrl(initialValues.faviconUrl);
      setMetaTitle(initialValues.metaTitle);
      setMetaDescription(initialValues.metaDescription);
      setLogoPreview(initialValues.logoUrl || null);
      setFaviconPreview(initialValues.faviconUrl || null);
    }
    router.push('/dashboard/themes');
  };

  const defaultColors = currentThemeData?.theme?.colors || {};
  const defaultFonts = currentThemeData?.theme?.typography || {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading theme...</div>
      </div>
    );
  }

  if (!currentThemeData?.theme) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">No active theme found.</p>
          <Link href="/dashboard/themes">
            <Button>Browse Themes</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/dashboard/themes">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Customize Theme</h1>
          </div>
          <p className="text-muted-foreground">
            Customize {currentThemeData.theme.title} to match your brand
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={updateMutation.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              toast.info('Import functionality is coming soon');
            }}
            disabled={true}
            title="Coming soon"
          >
            <UploadIcon className="h-4 w-4 mr-2" />
            Import
            <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded">Coming Soon</span>
          </Button>
          <input
            ref={importFileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
      <Tabs defaultValue="colors" className="space-y-6">
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger 
            value="colors"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            Colors
          </TabsTrigger>
          <TabsTrigger 
            value="typography"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            Typography
          </TabsTrigger>
          <TabsTrigger 
            value="layout"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            Layout
          </TabsTrigger>
          <TabsTrigger
            value="branding"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            Branding
          </TabsTrigger>
          <TabsTrigger
            value="images"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            Homepage Images
          </TabsTrigger>
          <TabsTrigger
            value="advanced"
            disabled
            title="Coming soon"
            className="data-[state=inactive]:text-muted-foreground/50"
          >
            Advanced
            <span className="ml-1.5 text-xs">🚧</span>
          </TabsTrigger>
        </TabsList>

        {/* Colors Tab */}
        <TabsContent value="colors">
          <Card>
            <CardHeader>
              <CardTitle>Color Customization</CardTitle>
              <CardDescription>
                Customize your theme colors. Leave empty to use theme defaults.
              </CardDescription>
              <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
                <h4 className="text-sm font-semibold mb-2">Color Application Status:</h4>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>✅ <strong>Primary:</strong> Applied via CSS variables (--primary, --color-primary) - Used in buttons, links, active states</li>
                  <li>✅ <strong>Secondary:</strong> Applied via CSS variables (--secondary, --color-secondary) - Used in secondary buttons, hover states</li>
                  <li>✅ <strong>Accent:</strong> Applied via CSS variables (--accent, --color-accent) - Used for hover effects, active links, highlights, and decorative elements</li>
                  <li>✅ <strong>Background:</strong> Applied via CSS variables (--background) - Page background</li>
                  <li>✅ <strong>Text:</strong> Applied via CSS variables (--foreground) - Main text color</li>
                  <li>⚠️ <strong>Muted:</strong> Applied via CSS variables (--color-muted) - Note: Some theme components may use hardcoded colors</li>
                  <li>✅ <strong>Button Background:</strong> Applied via CSS variables (--button-background, --primary) - Overrides primary color for buttons when set</li>
                  <li>✅ <strong>Button Text:</strong> Applied via CSS variables (--button-text, --primary-foreground) - Overrides primary-foreground for buttons when set</li>
                </ul>
                <p className="text-xs mt-3 text-muted-foreground">
                  <strong>Note:</strong> Colors are set as CSS custom properties and applied via ThemeProviderWrapper. 
                  Components using Tailwind classes like <code className="bg-muted px-1 rounded">text-primary</code>, <code className="bg-muted px-1 rounded">bg-primary</code> will automatically use these colors.
                  Some theme-specific components may need updates to fully utilize custom colors.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme Track B2.1 — AI-assisted styling */}
              <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    Style with AI
                  </h4>
                  <p className="text-xs text-purple-800 dark:text-purple-200 mt-1">
                    Describe a mood — inspired by, not a clone of — and I&apos;ll suggest colors and fonts. Never changes your layout, images, or text.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={aiStylePrompt}
                    onChange={(e) => setAiStylePrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !aiStyleMutation.isPending) handleGenerateAiStyle();
                    }}
                    placeholder='e.g. "warm and earthy" or "energetic and bold"'
                    className="bg-background"
                    disabled={aiStyleMutation.isPending}
                  />
                  <Button
                    type="button"
                    onClick={handleGenerateAiStyle}
                    disabled={aiStyleMutation.isPending}
                    className="shrink-0"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {aiStyleMutation.isPending ? 'Generating…' : 'Generate'}
                  </Button>
                </div>
              </div>

              {/* Theme Track B2.2 — AI-assisted styling from a reference site */}
              <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    Style from a reference site
                  </h4>
                  <p className="text-xs text-purple-800 dark:text-purple-200 mt-1">
                    Share a link to a site whose overall feeling you like — inspired by, not a clone of. I&apos;ll look at its general colors and typography, never its layout, images, logo, or text.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={aiStyleUrl}
                    onChange={(e) => setAiStyleUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !aiStyleFromUrlMutation.isPending) handleGenerateAiStyleFromUrl();
                    }}
                    placeholder="https://example.com"
                    className="bg-background"
                    disabled={aiStyleFromUrlMutation.isPending}
                  />
                  <Button
                    type="button"
                    onClick={handleGenerateAiStyleFromUrl}
                    disabled={aiStyleFromUrlMutation.isPending}
                    className="shrink-0"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {aiStyleFromUrlMutation.isPending ? 'Capturing & generating…' : 'Generate'}
                  </Button>
                </div>
                {aiStyleFromUrlMutation.isPending && (
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    This can take up to 20 seconds — capturing the page and analyzing its style.
                  </p>
                )}
              </div>

              {/* Recommended Color Schemes Info */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-100">
                  💡 Color Scheme Recommendations
                </h4>
                <p className="text-xs text-blue-800 dark:text-blue-200 mb-3">
                  Based on design best practices, ensure proper contrast ratios (WCAG AA: 4.5:1 for text, 3:1 for UI elements).
                  Avoid using similar shades for background and muted colors to maintain visibility.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div>
                    <strong className="text-blue-900 dark:text-blue-100">E-commerce Best Practices:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-blue-700 dark:text-blue-300">
                      <li>Primary: Use brand color (blue/green recommended)</li>
                      <li>Background: Light neutral (#FFFFFF or #FAFAFA)</li>
                      <li>Text: Dark neutral (#212121 or #1A1A1A)</li>
                      <li>Muted: Medium grey (#6B7280 or #9CA3AF)</li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-blue-900 dark:text-blue-100">Contrast Guidelines:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-blue-700 dark:text-blue-300">
                      <li>Text on background: ≥ 4.5:1</li>
                      <li>UI components: ≥ 3:1</li>
                      <li>Muted should be 40-60% lighter than text</li>
                      <li>Test with contrast checker tools</li>
                    </ul>
                  </div>
                </div>
              </div>

              {THEME_COLOR_SETTINGS.map(({ key: colorKey, description, recommended, note }) => {
                const defaultValue = (defaultColors as ThemeColors)[colorKey] || recommended || '#000000';
                const currentValue = customColors[colorKey] || defaultValue;
                return (
                  <div key={colorKey} className="space-y-2">
                    <div>
                      <Label htmlFor={`color-${colorKey}`} className="capitalize">
                        {colorKey === 'buttonBackground' ? 'Button Background' : 
                         colorKey === 'buttonText' ? 'Button Text' : 
                         colorKey} Color
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">{description}</p>
                      {note && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
                          💡 {note}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        id={`color-${colorKey}`}
                        type="color"
                        value={currentValue}
                        onChange={(e) => handleColorChange(colorKey, e.target.value)}
                        className="w-20 h-10 cursor-pointer border border-border rounded"
                      />
                      <Input
                        type="text"
                        value={currentValue}
                        onChange={(e) => handleColorChange(colorKey, e.target.value)}
                        placeholder={defaultValue}
                        className="flex-1 font-mono text-sm"
                        pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (recommended) {
                            handleColorChange(colorKey, recommended);
                          } else {
                            setCustomColors((prev) => {
                              const newColors = { ...prev };
                              delete newColors[colorKey];
                              return newColors;
                            });
                          }
                        }}
                        title={recommended ? `Set to recommended: ${recommended}` : 'Reset to default'}
                      >
                        {recommended ? 'Use Recommended' : 'Reset'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Typography Tab */}
        <TabsContent value="typography">
          <Card>
            <CardHeader>
              <CardTitle>Typography Settings</CardTitle>
              <CardDescription>
                Customize fonts and text styling
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="heading-font">Heading Font</Label>
                <Select
                  value={customFonts.headingFont || defaultFonts.headingFont || 'Inter'}
                  onValueChange={(value) =>
                    setCustomFonts((prev) => ({ ...prev, headingFont: value }))
                  }
                >
                  <SelectTrigger id="heading-font">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((font: any) => (
                      <SelectItem key={font.value} value={font.value}>
                        {font.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="body-font">Body Font</Label>
                <Select
                  value={customFonts.bodyFont || defaultFonts.bodyFont || 'Inter'}
                  onValueChange={(value) =>
                    setCustomFonts((prev) => ({ ...prev, bodyFont: value }))
                  }
                >
                  <SelectTrigger id="body-font">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((font: any) => (
                      <SelectItem key={font.value} value={font.value}>
                        {font.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="base-font-size">Base Font Size (px)</Label>
                <Input
                  id="base-font-size"
                  type="number"
                  value={customFonts.baseFontSize || defaultFonts.baseFontSize || 16}
                  onChange={(e) =>
                    setCustomFonts((prev) => ({
                      ...prev,
                      baseFontSize: parseInt(e.target.value) || 16,
                    }))
                  }
                  min="12"
                  max="24"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="heading-weight">Heading Weight</Label>
                <Select
                  value={String(customFonts.headingWeight || defaultFonts.headingWeight || 700)}
                  onValueChange={(value) =>
                    setCustomFonts((prev) => ({
                      ...prev,
                      headingWeight: parseInt(value),
                    }))
                  }
                >
                  <SelectTrigger id="heading-weight">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_WEIGHTS.map((weight: any) => (
                      <SelectItem key={weight.value} value={weight.value}>
                        {weight.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Layout Tab */}
        <TabsContent value="layout">
          <Card>
            <CardHeader>
              <CardTitle>Layout Options</CardTitle>
              <CardDescription>
                Configure header, footer, and sidebar layouts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="header-style">Header Style</Label>
                <Select
                  value={customLayouts.header || 'sticky'}
                  onValueChange={(value: 'sticky' | 'static' | 'transparent') =>
                    setCustomLayouts((prev) => ({ ...prev, header: value }))
                  }
                >
                  <SelectTrigger id="header-style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sticky">Sticky (follows scroll)</SelectItem>
                    <SelectItem value="static">Static (fixed position)</SelectItem>
                    <SelectItem value="transparent">Transparent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="footer-style">Footer Style</Label>
                <Select
                  value={customLayouts.footer || 'multi-column'}
                  onValueChange={(value: 'multi-column' | 'simple' | 'minimal') =>
                    setCustomLayouts((prev) => ({ ...prev, footer: value }))
                  }
                >
                  <SelectTrigger id="footer-style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multi-column">Multi-Column</SelectItem>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sidebar-position">Sidebar Position</Label>
                <Select
                  value={customLayouts.sidebar || 'none'}
                  onValueChange={(value: 'left' | 'right' | 'none') =>
                    setCustomLayouts((prev) => ({ ...prev, sidebar: value }))
                  }
                >
                  <SelectTrigger id="sidebar-position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="container-width">Container Max Width (px)</Label>
                <Input
                  id="container-width"
                  type="number"
                  value={customLayouts.containerMaxWidth || 1200}
                  onChange={(e) =>
                    setCustomLayouts((prev) => ({
                      ...prev,
                      containerMaxWidth: parseInt(e.target.value) || 1200,
                    }))
                  }
                  min="800"
                  max="1920"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Branding & SEO</CardTitle>
              <CardDescription>
                Configure logo, favicon, and SEO metadata
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div className="space-y-2">
                <Label htmlFor="logo-upload">Logo</Label>
                <div className="space-y-3">
                  {logoPreview && (
                    <div className="relative inline-block">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-20 object-contain border rounded-md p-2 bg-muted"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => {
                          setLogoPreview(null);
                          setLogoUrl('');
                          if (logoFileInputRef.current) {
                            logoFileInputRef.current.value = '';
                          }
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      ref={logoFileInputRef}
                      id="logo-upload"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleLogoUpload(file);
                        }
                      }}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => logoFileInputRef.current?.click()}
                      disabled={logoUploading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {logoUploading ? 'Uploading...' : logoPreview ? 'Change Logo' : 'Upload Logo'}
                    </Button>
                    <Input
                      type="url"
                      value={logoUrl}
                      onChange={(e) => {
                        setLogoUrl(e.target.value);
                        setLogoPreview(e.target.value || null);
                      }}
                      placeholder="Or enter logo URL"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recommended: PNG or SVG, max 2MB. Square logo works best.
                  </p>
                </div>
              </div>

              {/* Favicon Upload */}
              <div className="space-y-2">
                <Label htmlFor="favicon-upload">Favicon</Label>
                <div className="space-y-3">
                  {faviconPreview && (
                    <div className="relative inline-block">
                      <img
                        src={faviconPreview}
                        alt="Favicon preview"
                        className="h-16 w-16 object-contain border rounded-md p-2 bg-muted"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => {
                          setFaviconPreview(null);
                          setFaviconUrl('');
                          if (faviconFileInputRef.current) {
                            faviconFileInputRef.current.value = '';
                          }
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      ref={faviconFileInputRef}
                      id="favicon-upload"
                      type="file"
                      accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/jpeg,image/jpg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFaviconUpload(file);
                        }
                      }}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => faviconFileInputRef.current?.click()}
                      disabled={faviconUploading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {faviconUploading ? 'Uploading...' : faviconPreview ? 'Change Favicon' : 'Upload Favicon'}
                    </Button>
                    {logoUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGenerateFavicon}
                        disabled={faviconUploading || !logoUrl}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate from Logo
                      </Button>
                    )}
                    <Input
                      type="url"
                      value={faviconUrl}
                      onChange={(e) => {
                        setFaviconUrl(e.target.value);
                        setFaviconPreview(e.target.value || null);
                      }}
                      placeholder="Or enter favicon URL"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recommended: 32x32px PNG or ICO, max 500KB. Or generate from logo above.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta-title">Meta Title</Label>
                <Input
                  id="meta-title"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="Your Store Name"
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground">
                  {metaTitle.length}/60 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta-description">Meta Description</Label>
                <Textarea
                  id="meta-description"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="A brief description of your store"
                  maxLength={160}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  {metaDescription.length}/160 characters
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Homepage Images Tab (DA.25) */}
        <TabsContent value="images">
          <HomepageImagesTab />
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Custom CSS</CardTitle>
                    <CardDescription>
                      Add custom CSS to further customize your theme. Use with caution.
                    </CardDescription>
                  </div>
                  {!canUseCustomCss && (
                    <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                      <Lock className="h-3 w-3" />
                      Pro feature
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {canUseCustomCss ? (
                  <div className="space-y-2">
                    <Label htmlFor="custom-css">Custom CSS</Label>
                    <Textarea
                      id="custom-css"
                      value={customCss}
                      onChange={(e) => setCustomCss(e.target.value)}
                      placeholder=".my-custom-class { color: red; }"
                      rows={10}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      CSS is sanitized and injected into your storefront pages. Make sure your selectors are specific to avoid conflicts.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center space-y-3">
                    <Lock className="h-6 w-6 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      Custom CSS is available on Pro plans. Upgrade to add your own styling on top of this theme.
                    </p>
                    <Button asChild size="sm" variant="outline">
                      <Link href="/dashboard/subscription">Upgrade to Pro</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {currentThemeData?.theme && (
              <Card>
                <CardHeader>
                  <CardTitle>Theme Information</CardTitle>
                  <CardDescription>
                    Current theme details and version
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Theme:</span>
                    <span className="text-sm font-medium">{currentThemeData.theme.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Version:</span>
                    <span className="text-sm font-medium">{(currentThemeData.theme as any).version || '1.0.0'}</span>
                  </div>
                  {(currentThemeData.theme as any).author && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Author:</span>
                      <span className="text-sm font-medium">{(currentThemeData.theme as any).author}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {currentThemeData?.theme?.slug && (
        <div className="hidden lg:block">
          <LiveThemePreview
            slug={currentThemeData.theme.slug}
            colors={customColors}
            typography={customFonts as Record<string, string | number | undefined>}
          />
        </div>
      )}
      </div>

      {/* Save and Cancel buttons at the bottom */}
      <div className="mt-8 pt-6 border-t flex items-center justify-end gap-4">
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={updateMutation.isPending}
        >
          <Undo2 className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}

