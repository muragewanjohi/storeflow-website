/**
 * SEO Preview Component
 * 
 * Shows how the page will appear in search engine results
 * 
 * Day 29: Content Management - SEO & Content Tools
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface SEOPreviewProps {
  title?: string | null;
  description?: string | null;
  slug?: string | null;
  baseUrl?: string;
}

export default function SEOPreview({
  title,
  description,
  slug,
  baseUrl = 'https://example.com',
}: Readonly<SEOPreviewProps>) {
  // Generate full URL
  const fullUrl = slug ? `${baseUrl}/${slug}` : baseUrl;
  
  // Truncate title to 60 characters (Google's recommended limit)
  const displayTitle = title
    ? title.length > 60
      ? `${title.substring(0, 57)}...`
      : title
    : 'Page Title';
  
  // Truncate description to 160 characters (Google's recommended limit)
  const displayDescription = description
    ? description.length > 160
      ? `${description.substring(0, 157)}...`
      : description
    : 'Add a meta description to see how it will appear in search results.';

  return (
    <Card>
      <CardHeader>
        <CardTitle>SEO Preview</CardTitle>
        <CardDescription>
          How your page will appear in search engine results
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Search Result Preview</Label>
          <div className="border rounded-lg p-4 bg-background">
            {/* Google Search Result Preview */}
            <div className="space-y-1">
              {/* URL */}
              <div className="text-xs text-green-700 dark:text-green-400">
                {fullUrl}
              </div>
              
              {/* Title */}
              <div className="text-lg text-blue-600 dark:text-blue-400 hover:underline cursor-pointer line-clamp-1">
                {displayTitle || 'Page Title'}
              </div>
              
              {/* Description */}
              <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {displayDescription}
              </div>
            </div>
          </div>
        </div>

        {/* SEO Metrics */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <Label className="text-xs text-muted-foreground">Title Length</Label>
            <p className="text-sm font-medium">
              {title?.length || 0} / 60 characters
            </p>
            {title && title.length > 60 && (
              <p className="text-xs text-destructive mt-1">
                Title is too long (recommended: 50-60 characters)
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Description Length</Label>
            <p className="text-sm font-medium">
              {description?.length || 0} / 160 characters
            </p>
            {description && description.length > 160 && (
              <p className="text-xs text-destructive mt-1">
                Description is too long (recommended: 150-160 characters)
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

