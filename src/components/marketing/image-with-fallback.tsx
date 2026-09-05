import React, { useState } from 'react';
import Image from 'next/image';

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==';

interface ImageWithFallbackProps extends React.ComponentPropsWithoutRef<'div'> {
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  className?: string;
  style?: React.CSSProperties;
  onError?: () => void;
}

export function ImageWithFallback({ 
  src, 
  alt = '', 
  width, 
  height, 
  fill = false,
  sizes,
  className = '', 
  style,
  onError,
  ...rest 
}: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false);

  const handleError = () => {
    setDidError(true);
    onError?.();
  };

  if (!src) return null;

  // If error or data URL/blob, use regular img tag
  if (didError || src.startsWith('data:') || src.startsWith('blob:')) {
    return (
      <div
        className={`inline-block bg-gray-100 text-center align-middle ${className}`}
        style={style}
        {...rest}
      >
        <div className="flex items-center justify-center w-full h-full">
          <img 
            src={didError ? ERROR_IMG_SRC : src} 
            alt={didError ? 'Error loading image' : alt} 
            className={className}
            style={style}
            onError={handleError}
            data-original-url={src}
          />
        </div>
      </div>
    );
  }

  // Use Next.js Image for optimized images
  if (fill) {
    return (
      <div className={`relative w-full h-full ${className}`} style={style} {...rest}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes || '100vw'}
          className="object-cover"
          onError={handleError}
          unoptimized={src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('/')}
        />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width || 800}
      height={height || 600}
      className={className}
      style={style}
      sizes={sizes}
      onError={handleError}
      unoptimized={src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('/')}
      {...rest}
    />
  );
}
