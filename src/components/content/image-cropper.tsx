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
  open: boolean;
  uploadEndpoint?: string; // Optional: if provided, will upload the cropped image
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
  open,
  uploadEndpoint,
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
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    // Set canvas size to match the cropped area
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Draw the cropped image
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    // Convert canvas to blob, then to File
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'));
            return;
          }
          // Convert blob to File
          const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
          resolve(file);
        },
        'image/jpeg',
        0.95
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
          <DialogTitle>Crop Banner Image</DialogTitle>
          <DialogDescription>
            Drag the image to adjust position, use zoom to crop, then click Apply
          </DialogDescription>
        </DialogHeader>
        <div className="relative w-full h-[400px] bg-black rounded-md overflow-hidden">
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
        <DialogFooter>
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

