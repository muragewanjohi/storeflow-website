/**
 * Image Upload Field Component
 * 
 * Reusable component for uploading, previewing, cropping, and managing images
 * Used for banner images, featured images, etc.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PhotoIcon, PencilIcon, XMarkIcon } from '@heroicons/react/24/outline';
import ImageCropper from './image-cropper';

interface ImageUploadFieldProps {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  uploadEndpoint?: string; // Defaults to '/api/media/upload'
  aspectRatio?: number; // Defaults to 16/9
  maxSizeMB?: number; // Defaults to 5
  helpText?: string;
}

export default function ImageUploadField({
  label,
  value,
  onChange,
  uploadEndpoint = '/api/media/upload',
  aspectRatio = 16 / 9,
  maxSizeMB = 5,
  helpText,
}: Readonly<ImageUploadFieldProps>) {
  const [imagePreview, setImagePreview] = useState<string | null>(value);
  const [isUploading, setIsUploading] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update preview when value changes externally
  useEffect(() => {
    setImagePreview(value);
  }, [value]);

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Only images (JPEG, PNG, WebP, GIF) are allowed.');
      return;
    }

    // Validate file size
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File size exceeds ${maxSizeMB}MB limit`);
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const { url } = await response.json();
      // Show crop dialog instead of directly setting the image
      setImageToCrop(url);
      setShowCropDialog(true);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    onChange(null);
    setImagePreview(null);
  };

  const handleCropComplete = (croppedImageUrl: string) => {
    // Update with cropped image
    onChange(croppedImageUrl);
    setImagePreview(croppedImageUrl);
    setShowCropDialog(false);
    setImageToCrop(null);
  };

  const handleCropCancel = () => {
    setShowCropDialog(false);
    setImageToCrop(null);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {imagePreview ? (
        <div className="relative">
          <img
            src={imagePreview}
            alt="Image preview"
            className="w-full h-48 object-cover rounded-md border"
          />
          <div className="absolute top-2 right-2 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setImageToCrop(imagePreview);
                setShowCropDialog(true);
              }}
              title="Crop/Reposition image"
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemoveImage}
              title="Remove image"
            >
              <XMarkIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed rounded-md p-8 text-center">
          <PhotoIcon className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            No {label.toLowerCase()} selected
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={handleImageUpload}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : `Upload ${label}`}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}
      {helpText && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}

      {/* Image Cropper Dialog */}
      {showCropDialog && imageToCrop && (
        <ImageCropper
          image={imageToCrop}
          aspect={aspectRatio}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          open={showCropDialog}
        />
      )}
    </div>
  );
}

