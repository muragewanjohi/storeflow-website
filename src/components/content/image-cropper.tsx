/**
 * Image Cropper Component
 * 
 * Allows users to crop and position images with drag support
 * Uses react-easy-crop library
 */

'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

interface ImageCropperProps {
  image: string;
  aspect?: number;
  onCropComplete: (croppedImageUrl: string) => void;
  onCancel: () => void;
  onUseFullImage?: () => void; // If provided, show "Use full image" to skip cropping
  open: boolean;
  uploadEndpoint?: string; // Optional: if provided, will upload the cropped image
  imageType?: string; // e.g. 'image/png' to preserve transparency when outputting
}

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function ImageCropper({
  image,
  aspect = 16 / 9, // Default banner aspect ratio
  onCropComplete,
  onCancel,
  onUseFullImage,
  open,
  uploadEndpoint,
  imageType,
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const onCropChange = useCallback((crop: { x: number; y: number }) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const onCropCompleteCallback = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      // Fetch image as blob first to avoid CORS/tainted canvas issues
      fetch(url)
        .then((res) => {
          if (!res.ok) {
            throw new Error('Failed to fetch image');
          }
          return res.blob();
        })
        .then((blob) => {
          const blobUrl = URL.createObjectURL(blob);
          const image = new Image();
          image.addEventListener('load', () => {
            URL.revokeObjectURL(blobUrl);
            resolve(image);
          });
          image.addEventListener('error', (error) => {
            URL.revokeObjectURL(blobUrl);
            reject(error);
          });
          image.src = blobUrl;
        })
        .catch((error) => reject(error));
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area
  ): Promise<File> => {
    const imageEl = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    // Set canvas size to match the cropped area
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Preserve transparency for PNG/WebP so transparent areas don't become black
    const preserveAlpha = imageType === 'image/png' || imageType === 'image/webp' || imageType === 'image/gif';
    if (preserveAlpha) {
      ctx.clearRect(0, 0, pixelCrop.width, pixelCrop.height);
    }

    // Draw the cropped image
    ctx.drawImage(
      imageEl,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    const mimeType = preserveAlpha ? 'image/png' : 'image/jpeg';
    const extension = preserveAlpha ? 'png' : 'jpg';

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'));
            return;
          }
          const file = new File([blob], `cropped-image.${extension}`, { type: mimeType });
          resolve(file);
        },
        mimeType,
        preserveAlpha ? undefined : 0.95
      );
    });
  };

  const handleCrop = async () => {
    if (!croppedAreaPixels) return;

    setIsUploading(true);
    try {
      const croppedFile = await getCroppedImg(image, croppedAreaPixels);
      
      // If upload endpoint is provided, upload the cropped image
      if (uploadEndpoint) {
        const formData = new FormData();
        formData.append('file', croppedFile);

        const response = await fetch(uploadEndpoint, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to upload cropped image');
        }

        const { url } = await response.json();
        onCropComplete(url);
      } else {
        // Otherwise, use blob URL (temporary)
        const blobUrl = URL.createObjectURL(croppedFile);
        onCropComplete(blobUrl);
      }
    } catch (error) {
      console.error('Error cropping image:', error);
      alert(error instanceof Error ? error.message : 'Failed to crop image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Crop Image</DialogTitle>
          <DialogDescription>
            Drag the image to adjust position, use zoom to crop, then click Apply. Transparent areas will be preserved for PNG/WebP images.
          </DialogDescription>
        </DialogHeader>
        <div
          className="relative w-full h-[400px] rounded-md overflow-hidden bg-muted"
          style={{
            backgroundImage: 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)',
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
            backgroundColor: '#f3f4f6',
          }}
        >
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteCallback}
            cropShape="rect"
            showGrid={false}
          />
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Zoom</label>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={(value) => setZoom(value[0])}
              className="w-full"
            />
          </div>
        </div>
        <DialogFooter className="flex-wrap gap-2">
          {onUseFullImage && (
            <Button
              type="button"
              variant="secondary"
              onClick={onUseFullImage}
              disabled={isUploading}
              className="mr-auto"
            >
              Use full image (no crop)
            </Button>
          )}
          <Button variant="outline" onClick={onCancel} disabled={isUploading}>
            <XMarkIcon className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleCrop} disabled={isUploading}>
            <CheckIcon className="mr-2 h-4 w-4" />
            {isUploading ? 'Uploading...' : 'Apply Crop'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

