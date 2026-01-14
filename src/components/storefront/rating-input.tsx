/**
 * Rating Input Component
 * 
 * Component for users to submit ratings using @smastrom/react-rating
 */

'use client';

import { useState } from 'react';
import { Rating, Star } from '@smastrom/react-rating';
import '@smastrom/react-rating/style.css';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface RatingInputProps {
  productId: string;
  onSubmit?: (rating: number, comment: string) => Promise<void>;
  className?: string;
}

export default function RatingInput({
  productId,
  onSubmit,
  className = '',
}: Readonly<RatingInputProps>) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    if (!comment.trim()) {
      toast.error('Please write a review');
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
            comment: comment.trim(),
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to submit review');
        }

        toast.success('Review submitted successfully!');
        setRating(0);
        setComment('');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <Label className="text-base font-medium mb-2 block">Your Rating</Label>
        <div className="flex items-center gap-3">
          <Rating
            value={hoveredRating || rating}
            onChange={setRating}
            onHoverChange={setHoveredRating}
            itemStyles={{
              itemShapes: Star,
              activeFillColor: '#ffb700',
              inactiveFillColor: '#d1d5db',
            }}
            spaceBetween="medium"
            radius="large"
            style={{ maxWidth: 'fit-content' }}
          />
          {rating > 0 && (
            <span className="text-sm text-muted-foreground">
              {rating} {rating === 1 ? 'star' : 'stars'}
            </span>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="review-comment" className="text-base font-medium mb-2 block">
          Your Review
        </Label>
        <Textarea
          id="review-comment"
          placeholder="Share your experience with this product..."
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
        disabled={isSubmitting || rating === 0 || !comment.trim()}
        className="w-full md:w-auto"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Review'}
      </Button>
    </div>
  );
}
