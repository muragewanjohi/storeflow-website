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
import { Save, ArrowLeft, Upload, X, Sparkles, Download, Upload as UploadIcon, Code } from 'lucide-react';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { useRef } from 'react';

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

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Merriweather', label: 'Merriweather' },
];

const FONT_WEIGHTS = [
  { value: '300', label: 'Light (300)' },
  { value: '400', label: 'Regular (400)' },
  { value: '500', label: 'Medium (500)' },
  { value: '600', label: 'Semi Bold (600)' },
  { value: '700', label: 'Bold (700)' },
];

export default function ThemeCustomizeClient() {
  const queryClient = useQueryClient();

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
  const [customLayouts, setCustomLayouts] = useState<ThemeLayout>({});
  const [customCss, setCustomCss] = useState('');
  const [customJs, setCustomJs] = useState('');
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

  // Initialize form with current customizations
  useEffect(() => {
    if (currentThemeData) {
      const customizations = currentThemeData.customizations || {};
      setCustomColors(customizations.custom_colors || {});
      setCustomFonts(customizations.custom_fonts || {});
      setCustomLayouts(customizations.custom_layouts || {});
      setCustomCss(customizations.custom_css || '');
      setCustomJs((customizations as any).custom_js || '');
      setLogoUrl(customizations.logo_url || '');
      setFaviconUrl(customizations.favicon_url || '');
      setMetaTitle(customizations.meta_title || '');
      setMetaDescription(customizations.meta_description || '');
    }
  }, [currentThemeData]);

  // Update theme customizations mutation
  const updateMutation = useMutation({
    mutationFn: async (data: {
      custom_colors?: ThemeColors;
      custom_fonts?: ThemeTypography;
      custom_layouts?: ThemeLayout;
      custom_css?: string;
      custom_js?: string;
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
      custom_css: customCss,
      custom_js: customJs,
      logo_url: logoUrl,
      favicon_url: faviconUrl,
      meta_title: metaTitle,
      meta_description: metaDescription,
    });
  };

  const handleColorChange = (key: string, value: string) => {
    setCustomColors((prev) => ({ ...prev, [key]: value }));
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
            onClick={() => importFileInputRef.current?.click()}
            disabled={updateMutation.isPending}
          >
            <UploadIcon className="h-4 w-4 mr-2" />
            Import
          </Button>
          <input
            ref={importFileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="colors" className="space-y-6">
        <TabsList>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* Colors Tab */}
        <TabsContent value="colors">
          <Card>
            <CardHeader>
              <CardTitle>Color Customization</CardTitle>
              <CardDescription>
                Customize your theme colors. Leave empty to use theme defaults.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {['primary', 'secondary', 'accent', 'background', 'text', 'muted'].map((colorKey) => {
                const defaultValue = (defaultColors as ThemeColors)[colorKey] || '#000000';
                const currentValue = customColors[colorKey] || defaultValue;
                return (
                  <div key={colorKey} className="space-y-2">
                    <Label htmlFor={`color-${colorKey}`} className="capitalize">
                      {colorKey} Color
                    </Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id={`color-${colorKey}`}
                        type="color"
                        value={currentValue}
                        onChange={(e) => handleColorChange(colorKey, e.target.value)}
                        className="w-20 h-10 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={currentValue}
                        onChange={(e) => handleColorChange(colorKey, e.target.value)}
                        placeholder={defaultValue}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCustomColors((prev) => {
                            const newColors = { ...prev };
                            delete newColors[colorKey];
                            return newColors;
                          });
                        }}
                      >
                        Reset
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
                    {FONT_OPTIONS.map((font) => (
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
                    {FONT_OPTIONS.map((font) => (
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
                    {FONT_WEIGHTS.map((weight) => (
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

        {/* Advanced Tab */}
        <TabsContent value="advanced">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Custom CSS</CardTitle>
                <CardDescription>
                  Add custom CSS to further customize your theme. Use with caution.
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                    CSS will be injected into the storefront pages. Make sure your selectors are specific to avoid conflicts.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Custom JavaScript</CardTitle>
                <CardDescription>
                  Add custom JavaScript code to your storefront. Use with extreme caution.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="custom-js">Custom JavaScript</Label>
                  <Textarea
                    id="custom-js"
                    value={customJs}
                    onChange={(e) => setCustomJs(e.target.value)}
                    placeholder="console.log('Custom script loaded');"
                    rows={10}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    JavaScript will be executed on all storefront pages. Ensure your code is safe and doesn&apos;t conflict with existing functionality.
                  </p>
                </div>
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
    </div>
  );
}

