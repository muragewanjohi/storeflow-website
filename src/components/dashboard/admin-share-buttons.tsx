/**
 * Admin Share Buttons Component
 * 
 * Social media sharing buttons for tenant admins to promote products and sales.
 * Unlike the storefront version, this shows all social platforms for marketing.
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LinkIcon, CheckIcon, ShareIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

interface AdminShareButtonsProps {
  /** The title/name of the item being shared */
  title: string;
  /** The URL path to the item (e.g., /products/my-product) */
  url: string;
  /** Optional image URL for Pinterest sharing */
  image?: string | null;
  /** Optional description for richer sharing */
  description?: string | null;
  /** Optional price to include in share text */
  price?: number | null;
  /** Currency code for price formatting */
  currency?: string;
  /** Type of content being shared */
  type?: 'product' | 'sale' | 'page';
  /** Store URL (if not provided, will use window.location.origin) */
  storeUrl?: string;
}

export default function AdminShareButtons({
  title,
  url,
  image,
  description,
  price,
  currency = 'USD',
  type = 'product',
  storeUrl,
}: Readonly<AdminShareButtonsProps>) {
  const [copied, setCopied] = useState(false);

  // Build full URL with UTM parameters for tracking
  const buildTrackableUrl = (platform: string): string => {
    const baseUrl = storeUrl 
      ? `${storeUrl}${url}`
      : typeof window !== 'undefined'
        ? `${window.location.origin.replace('/dashboard', '')}${url}`
        : url;
    
    const urlObj = new URL(baseUrl);
    urlObj.searchParams.set('utm_source', platform);
    urlObj.searchParams.set('utm_medium', 'social');
    urlObj.searchParams.set('utm_campaign', `${type}_promotion`);
    
    return urlObj.toString();
  };

  const fullUrl = storeUrl 
    ? `${storeUrl}${url}`
    : typeof window !== 'undefined'
      ? `${window.location.origin.replace('/dashboard', '')}${url}`
      : url;

  // Build share text based on content type
  const getShareText = (): string => {
    let text = title;
    
    if (description) {
      const shortDesc = description.length > 100 
        ? `${description.substring(0, 100)}...` 
        : description;
      text = `${title} - ${shortDesc}`;
    }
    
    if (price) {
      const formattedPrice = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(price);
      text = `${text} - ${formattedPrice}`;
    }
    
    if (type === 'sale') {
      text = `🎉 ${text}`;
    }
    
    return text;
  };

  const shareText = getShareText();

  const handleShare = async (platform: string) => {
    const trackableUrl = buildTrackableUrl(platform);
    const encodedUrl = encodeURIComponent(trackableUrl);
    const encodedText = encodeURIComponent(shareText);
    const encodedImage = image ? encodeURIComponent(image) : '';

    let shareUrl = '';

    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
        break;
      case 'pinterest':
        shareUrl = image
          ? `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodedImage}&description=${encodedText}`
          : `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedText}`;
        break;
      case 'instagram':
        // Instagram doesn't support direct link sharing
        try {
          await navigator.clipboard.writeText(trackableUrl);
          toast.success('Link copied for Instagram!', {
            description: 'Paste it in your Instagram bio or story. Use "Link in bio" in your posts.',
            duration: 5000,
          });
        } catch {
          toast.info('Instagram Sharing', {
            description: 'Copy the URL and add it to your Instagram bio. Use "Link in bio" in your posts.',
          });
        }
        return;
      case 'copy':
        try {
          await navigator.clipboard.writeText(trackableUrl);
          setCopied(true);
          toast.success('Link copied to clipboard!');
          setTimeout(() => setCopied(false), 2000);
          return;
        } catch {
          toast.error('Failed to copy link');
          return;
        }
      default:
        return;
    }

    // Open share window
    window.open(
      shareUrl,
      'share',
      'width=600,height=400,menubar=no,toolbar=no,resizable=yes,scrollbars=yes'
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <ShareIcon className="mr-2 h-4 w-4" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => handleShare('facebook')}>
          <svg className="mr-2 h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
          </svg>
          Share on Facebook
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleShare('twitter')}>
          <svg className="mr-2 h-4 w-4 text-sky-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Share on X (Twitter)
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleShare('whatsapp')}>
          <svg className="mr-2 h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
          Share on WhatsApp
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleShare('linkedin')}>
          <svg className="mr-2 h-4 w-4 text-blue-700" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
          Share on LinkedIn
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => handleShare('instagram')}>
          <svg className="mr-2 h-4 w-4 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
          Copy for Instagram
        </DropdownMenuItem>
        
        {image && (
          <DropdownMenuItem onClick={() => handleShare('pinterest')}>
            <svg className="mr-2 h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z" />
            </svg>
            Share on Pinterest
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => handleShare('copy')}>
          {copied ? (
            <>
              <CheckIcon className="mr-2 h-4 w-4 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <LinkIcon className="mr-2 h-4 w-4" />
              Copy Link
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
