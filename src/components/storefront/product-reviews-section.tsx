/**
 * Product Reviews Section Component
 * 
 * Displays reviews and allows users to submit new reviews
 */

'use client';

import { useState, useEffect } from 'react';
import { RatingDisplay } from '@/components/storefront/rating-display';
import RatingInput from '@/components/storefront/rating-input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface Review {
  id: string;
  rating: number;
  comment: string;
  customer: {
    name: string;
    email: string;
    image: string | null;
  } | null;
  created_at: string;
}

interface ProductReviewsSectionProps {
  productId: string;
  className?: string;
}

export default function ProductReviewsSection({
  productId,
  className = '',
}: Readonly<ProductReviewsSectionProps>) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [reviewEligibility, setReviewEligibility] = useState<{
    canReview: boolean;
    hasPurchased: boolean;
    hasReviewed: boolean;
    reason?: string;
    code?: string;
  } | null>(null);

  // Check authentication status and review eligibility
  useEffect(() => {
    const checkAuthAndEligibility = async () => {
      try {
        const authResponse = await fetch('/api/customers/profile');
        setIsAuthenticated(authResponse.ok);
        
        // Check review eligibility
        const eligibilityResponse = await fetch(`/api/products/${productId}/can-review`);
        if (eligibilityResponse.ok) {
          const eligibilityData = await eligibilityResponse.json();
          setReviewEligibility(eligibilityData);
          setCanReview(eligibilityData.canReview || false);
        }
      } catch {
        setIsAuthenticated(false);
        setCanReview(false);
      }
    };
    checkAuthAndEligibility();
  }, [productId]);

  // Fetch reviews
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch(`/api/products/${productId}/reviews?limit=10`);
        if (response.ok) {
          const data = await response.json();
          setReviews(data.reviews || []);
          setAverageRating(data.stats?.averageRating || 0);
          setTotalReviews(data.stats?.totalReviews || 0);
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, [productId]);

  const handleSubmitReview = async (rating: number, comment: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/products/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          rating,
          comment,
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
          });
          return;
        }
        
        throw new Error(error.error || 'Failed to submit review');
      }

      toast.success('Review submitted successfully!', {
        description: 'Your review will be visible after approval',
      });
      setShowReviewForm(false);

      // Refresh reviews and eligibility
      const [reviewsResponse, eligibilityResponse] = await Promise.all([
        fetch(`/api/products/${productId}/reviews?limit=10`),
        fetch(`/api/products/${productId}/can-review`),
      ]);
      
      if (reviewsResponse.ok) {
        const data = await reviewsResponse.json();
        setReviews(data.reviews || []);
        setAverageRating(data.stats?.averageRating || 0);
        setTotalReviews(data.stats?.totalReviews || 0);
      }
      
      if (eligibilityResponse.ok) {
        const eligibilityData = await eligibilityResponse.json();
        setReviewEligibility(eligibilityData);
        setCanReview(eligibilityData.canReview || false);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl mb-2">Customer Reviews</CardTitle>
              {!isLoading && (
                <div className="flex items-center gap-2">
                  <RatingDisplay
                    rating={averageRating}
                    totalReviews={totalReviews}
                    size="sm"
                    showCount={true}
                  />
                </div>
              )}
            </div>
            {!showReviewForm && canReview && (
              <Button onClick={() => setShowReviewForm(true)}>
                Write a Review
              </Button>
            )}
            {!showReviewForm && !canReview && reviewEligibility && (
              <div className="text-sm text-muted-foreground">
                {reviewEligibility.code === 'PURCHASE_REQUIRED' && (
                  <span>Purchase required to review</span>
                )}
                {reviewEligibility.code === 'LOGIN_REQUIRED' && (
                  <span>Login required to review</span>
                )}
                {reviewEligibility.code === 'ALREADY_REVIEWED' && (
                  <span>You&apos;ve already reviewed this product</span>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Review Form */}
          {showReviewForm && canReview && (
            <div className="mb-8 pb-8 border-b">
              <RatingInput
                productId={productId}
                onSubmit={handleSubmitReview}
              />
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReviewForm(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Reviews List */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading reviews...
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No reviews yet. Be the first to review this product!
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review.id} className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {review.customer?.image ? (
                        <img
                          src={review.customer.image}
                          alt={review.customer.name}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-semibold">
                            {review.customer?.name?.[0]?.toUpperCase() || 'U'}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold">
                          {review.customer?.name || 'Anonymous'}
                        </p>
                        <RatingDisplay
                          rating={review.rating}
                          size="sm"
                          showCount={false}
                        />
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(review.created_at)}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{review.comment}</p>
                  <Separator className="mt-4" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
