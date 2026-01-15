/**
 * Rating Input Component
 * 
 * Component for users to submit ratings using @smastrom/react-rating
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon, ShoppingBagIcon, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingInputProps {
  productId: string;
  onSubmit?: (rating: number, comment: string) => Promise<void>;
  className?: string;
}

interface ReviewEligibility {
  canReview: boolean;
  hasPurchased: boolean;
  hasReviewed: boolean;
  reason?: string;
  code?: string;
}

export default function RatingInput({
  productId,
  onSubmit,
  className = '',
}: Readonly<RatingInputProps>) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(true);

  // Check if user can review this product
  useEffect(() => {
    const checkEligibility = async () => {
      try {
        const response = await fetch(`/api/products/${productId}/can-review`);
        if (response.ok) {
          const data = await response.json();
          setEligibility(data);
        } else {
          // If endpoint doesn't exist or fails, allow review (backward compatibility)
          setEligibility({
            canReview: true,
            hasPurchased: true,
            hasReviewed: false,
          });
        }
      } catch (error) {
        console.error('Error checking review eligibility:', error);
        // On error, allow review (backward compatibility)
        setEligibility({
          canReview: true,
          hasPurchased: true,
          hasReviewed: false,
        });
      } finally {
        setIsCheckingEligibility(false);
      }
    };

    checkEligibility();
  }, [productId]);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    // Comment is optional, but rating is mandatory

    // Check eligibility before submitting
    if (eligibility && !eligibility.canReview) {
      if (eligibility.code === 'LOGIN_REQUIRED') {
        toast.error('Please login to review products', {
          description: 'You must be logged in to submit a review',
          action: {
            label: 'Login',
            onClick: () => router.push('/login?redirect=/products'),
          },
        });
      } else if (eligibility.code === 'PURCHASE_REQUIRED') {
        toast.error('Purchase required', {
          description: 'You can only review products you have purchased',
        });
      } else if (eligibility.code === 'ALREADY_REVIEWED') {
        toast.error('Already reviewed', {
          description: 'You have already reviewed this product',
        });
      }
      return;
    }

    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(rating, comment);
      } else {
        // Default submission to API
        const response = await fetch('/api/products/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: productId,
            rating,
            comment: comment.trim() || undefined, // Send undefined if empty
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          
          // Handle specific error codes
          if (error.code === 'PURCHASE_REQUIRED') {
            toast.error('Purchase required', {
              description: 'You can only review products you have purchased',
            });
            return;
          } else if (error.code === 'LOGIN_REQUIRED') {
            toast.error('Please login to review products', {
              description: 'You must be logged in to submit a review',
              action: {
                label: 'Login',
                onClick: () => router.push('/login?redirect=/products'),
              },
            });
            return;
          }
          
          throw new Error(error.error || 'Failed to submit review');
        }

        toast.success('Review submitted successfully!', {
          description: 'Your review will be visible after approval',
        });
        // Reset form
        setRating(0);
        setComment('');
        setHoveredRating(null);
        
        // Refresh eligibility check
        const eligibilityResponse = await fetch(`/api/products/${productId}/can-review`);
        if (eligibilityResponse.ok) {
          const data = await eligibilityResponse.json();
          setEligibility(data);
        }
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking eligibility
  if (isCheckingEligibility) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="text-center py-4 text-muted-foreground">
          Checking review eligibility...
        </div>
      </div>
    );
  }

  // Show message if user cannot review
  if (eligibility && !eligibility.canReview) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            {eligibility.code === 'LOGIN_REQUIRED' && (
              <>
                <p className="font-medium mb-1">Login Required</p>
                <p className="text-sm">
                  You must be logged in to review products. Please{' '}
                  <button
                    onClick={() => router.push('/login?redirect=/products')}
                    className="text-primary hover:underline"
                  >
                    login
                  </button>{' '}
                  to continue.
                </p>
              </>
            )}
            {eligibility.code === 'PURCHASE_REQUIRED' && (
              <>
                <p className="font-medium mb-1 flex items-center gap-2">
                  <ShoppingBagIcon className="h-4 w-4" />
                  Purchase Required
                </p>
                <p className="text-sm">
                  You can only review products you have purchased. After purchasing this product, 
                  you&apos;ll be able to share your experience with other customers.
                </p>
              </>
            )}
            {eligibility.code === 'ALREADY_REVIEWED' && (
              <>
                <p className="font-medium mb-1">Already Reviewed</p>
                <p className="text-sm">
                  You have already submitted a review for this product. Thank you for your feedback!
                </p>
              </>
            )}
            {!eligibility.code && eligibility.reason && (
              <p className="text-sm">{eligibility.reason}</p>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Custom star rating component with proper hover and click behavior
  const StarRating = () => {
    const displayRating = hoveredRating !== null ? hoveredRating : rating;
    
    return (
      <div 
        className="flex items-center gap-1" 
        role="radiogroup" 
        aria-label="Rating"
        onMouseLeave={() => setHoveredRating(null)}
      >
        {[1, 2, 3, 4, 5].map((starValue) => {
          const isFilled = starValue <= displayRating;
          return (
            <button
              key={starValue}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setRating(starValue);
                setHoveredRating(null); // Clear hover to show selected rating
              }}
              onMouseEnter={() => setHoveredRating(starValue)}
              className={cn(
                "transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded",
                "cursor-pointer p-0.5"
              )}
              aria-label={`Rate ${starValue} ${starValue === 1 ? 'star' : 'stars'}`}
              aria-checked={starValue === rating}
            >
              <Star
                className={cn(
                  "w-6 h-6 transition-all",
                  isFilled
                    ? "fill-yellow-400 text-yellow-400"
                    : "fill-gray-300 text-gray-300"
                )}
              />
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <Label className="text-base font-medium mb-2 block">Your Rating</Label>
        <div className="flex items-center gap-3">
          <StarRating />
          {rating > 0 && (
            <span className="text-sm text-muted-foreground">
              {rating} {rating === 1 ? 'star' : 'stars'}
            </span>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="review-comment" className="text-base font-medium mb-2 block">
          Your Review <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
        </Label>
        <Textarea
          id="review-comment"
          placeholder="Share your experience with this product... (Optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="resize-none"
          maxLength={1000}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {comment.length}/1000 characters
        </p>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || rating === 0 || (eligibility ? !eligibility.canReview : false)}
        className="w-full md:w-auto"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Review'}
      </Button>
    </div>
  );
}
