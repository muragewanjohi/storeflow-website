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
  const [starDistribution, setStarDistribution] = useState<Record<number, { count: number; percentage: number }>>({
    5: { count: 0, percentage: 0 },
    4: { count: 0, percentage: 0 },
    3: { count: 0, percentage: 0 },
    2: { count: 0, percentage: 0 },
    1: { count: 0, percentage: 0 },
  });
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
        setStarDistribution(data.stats?.starDistribution || {
          5: { count: 0, percentage: 0 },
          4: { count: 0, percentage: 0 },
          3: { count: 0, percentage: 0 },
          2: { count: 0, percentage: 0 },
          1: { count: 0, percentage: 0 },
        });
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
        description: 'Your review has been published',
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
        setStarDistribution(data.stats?.starDistribution || {
          5: { count: 0, percentage: 0 },
          4: { count: 0, percentage: 0 },
          3: { count: 0, percentage: 0 },
          2: { count: 0, percentage: 0 },
          1: { count: 0, percentage: 0 },
        });
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
          <CardTitle className="text-2xl mb-4">Customer Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading reviews...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Rating Summary (Amazon-style) */}
              <div className="lg:col-span-1">
                <div className="space-y-4">
                  {/* Overall Rating */}
                  <div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl font-bold">
                        {averageRating > 0 ? averageRating.toFixed(1) : '0.0'}
                      </span>
                      <span className="text-xl text-muted-foreground">out of 5</span>
                    </div>
                    <div className="mb-2">
                      <RatingDisplay
                        rating={averageRating}
                        size="md"
                        showCount={false}
                        className="scale-[0.7] origin-left"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {totalReviews} {totalReviews === 1 ? 'global rating' : 'global ratings'}
                    </p>
                  </div>

                  {/* Star Distribution Breakdown */}
                  {totalReviews > 0 && (
                    <div className="space-y-2 pt-4 border-t">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const dist = starDistribution[star] || { count: 0, percentage: 0 };
                        return (
                          <div key={star} className="flex items-center gap-2 text-sm">
                            <span className="w-12 text-right">{star} star</span>
                            <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-yellow-400 transition-all"
                                style={{ width: `${dist.percentage}%` }}
                              />
                            </div>
                            <span className="w-12 text-left text-muted-foreground">
                              {dist.percentage}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Individual Reviews */}
              <div className="lg:col-span-2">
                {reviews.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No reviews yet. Be the first to review this product!
                  </div>
                ) : (
                  <div className="space-y-6">
                    {reviews.map((review) => (
                      <div key={review.id} className="space-y-2 pb-6 border-b last:border-b-0">
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
                                className="scale-[0.4] origin-left"
                              />
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(review.created_at)}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="text-muted-foreground mt-2">{review.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
