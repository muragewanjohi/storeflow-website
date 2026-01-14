/**
 * Rating Display Component
 * 
 * Reusable component for displaying product ratings using @smastrom/react-rating
 */

'use client';

import { Rating, Star } from '@smastrom/react-rating';
import '@smastrom/react-rating/style.css';

interface RatingDisplayProps {
  rating: number;
  totalReviews?: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  readonly?: boolean;
  className?: string;
}

export function RatingDisplay({
  rating,
  totalReviews,
  size = 'md',
  showCount = true,
  readonly = true,
  className = '',
}: Readonly<RatingDisplayProps>) {
  // Size configurations
  const sizeConfig = {
    sm: { 
      itemStyles: {
        itemShapes: Star,
        activeFillColor: '#ffb700',
        inactiveFillColor: '#d1d5db',
      },
      spaceBetween: 'small' as const,
      radius: 'small' as const,
    },
    md: { 
      itemStyles: {
        itemShapes: Star,
        activeFillColor: '#ffb700',
        inactiveFillColor: '#d1d5db',
      },
      spaceBetween: 'medium' as const,
      radius: 'medium' as const,
    },
    lg: { 
      itemStyles: {
        itemShapes: Star,
        activeFillColor: '#ffb700',
        inactiveFillColor: '#d1d5db',
      },
      spaceBetween: 'medium' as const,
      radius: 'large' as const,
    },
  };

  const config = sizeConfig[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Rating
        value={rating}
        readOnly={readonly}
        itemStyles={config.itemStyles}
        spaceBetween={config.spaceBetween}
        radius={config.radius}
        style={{ maxWidth: 'fit-content' }}
      />
      {showCount && totalReviews !== undefined && (
        <span className="text-sm text-muted-foreground">
          ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
        </span>
      )}
      {showCount && totalReviews === undefined && rating > 0 && (
        <span className="text-sm text-muted-foreground">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

export default RatingDisplay;
