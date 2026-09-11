'use client';

import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import RatingStars from './RatingStars';
import TextInput from './TextInput';
import Textarea from './Textarea';
import AlertBanner from './AlertBanner';
import { cn } from '@/lib/utils';

export type ReviewModalState = 'default' | 'loading' | 'success' | 'error';

export interface ReviewModalProps {
  orderId: string;
  productId: string;
  productName: string;
  productImage?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showProductContext?: boolean;
  showValidationAlert?: boolean;
  initialRating?: number;
  initialTitle?: string;
  initialBody?: string;
  /**
   * Explicit lifecycle state override for Storybook and automated testing.
   */
  state?: ReviewModalState;
  /**
   * Optional custom submission handler (e.g. for testing mocks or overrides).
   */
  onSubmitReview?: (data: {
    orderId: string;
    productId: string;
    rating: number;
    title?: string;
    body?: string;
  }) => Promise<void>;
  'data-testid'?: string;
}

const RATING_LABELS: Record<number, string> = {
  0: 'Select a rating',
  1: '1 out of 5 · Poor',
  2: '2 out of 5 · Fair',
  3: '3 out of 5 · Good',
  4: '4 out of 5 · Very Good',
  5: '5 out of 5 · Excellent',
};

export default function ReviewModal({
  orderId,
  productId,
  productName,
  productImage,
  isOpen,
  onClose,
  onSuccess,
  showProductContext = true,
  showValidationAlert = false,
  initialRating = 5,
  initialTitle = '',
  initialBody = '',
  state: controlledState,
  onSubmitReview,
  'data-testid': testId = 'review-modal',
}: ReviewModalProps) {
  const [rating, setRating] = useState<number>(initialRating);
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [internalState, setInternalState] = useState<ReviewModalState>('default');
  const [error, setError] = useState<string | null>(null);

  // Sync initial props when opened
  useEffect(() => {
    if (isOpen) {
      setRating(initialRating);
      setTitle(initialTitle);
      setBody(initialBody);
      setInternalState('default');
      setError(null);
    }
  }, [isOpen, initialRating, initialTitle, initialBody]);

  const effectiveState = controlledState || internalState;
  const isLoading = effectiveState === 'loading';
  const isSuccess = effectiveState === 'success';
  const isError = effectiveState === 'error';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      setError('Please select a star rating before submitting your review.');
      setInternalState('error');
      return;
    }

    try {
      setInternalState('loading');
      setError(null);

      if (onSubmitReview) {
        await onSubmitReview({
          orderId,
          productId,
          rating,
          title: title.trim() || undefined,
          body: body.trim() || undefined,
        });
      } else {
        const res = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            productId,
            rating,
            title: title.trim() || undefined,
            body: body.trim() || undefined,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to submit review');
        }
      }

      setInternalState('success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error submitting review');
      setInternalState('error');
    }
  };

  const handleDone = () => {
    onSuccess();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={!isSuccess}
      closeOnBackdropClick={false}
      size="md"
      title={isSuccess ? 'Review Submitted' : 'Write a Review'}
      description={
        isSuccess
          ? 'Thank you for sharing your feedback with the Unwind & Doodle community.'
          : `Share your experience with ${productName}.`
      }
      data-testid={testId}
      footer={
        isSuccess ? (
          <div className="flex items-center justify-end w-full">
            <Button
              variant="primary"
              size="md"
              type="button"
              onClick={handleDone}
              className="w-full sm:w-auto px-8"
              data-testid="review-done-button"
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={onClose}
              disabled={isLoading}
              data-testid="review-cancel-button"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              form="review-modal-form"
              loading={isLoading}
              disabled={isLoading}
              data-testid="review-submit-button"
            >
              {isError ? 'Try Again' : 'Submit Review'}
            </Button>
          </div>
        )
      }
    >
      {/* 1. Success State Screen (Figma Variant 43:51621) */}
      {isSuccess ? (
        <div className="space-y-5 py-2 animate-in fade-in-50 duration-200" data-testid="review-success-screen">
          {/* Success Banner */}
          <div className="flex items-center gap-3.5 p-4 rounded-xl bg-status-success-bg border border-status-success-accent text-status-success-text">
            <div className="w-8 h-8 rounded-full bg-status-success-accent/20 flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5 text-status-success-accent"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 10l4 4 8-8" />
              </svg>
            </div>
            <div>
              <p className="font-heading font-semibold text-sm">Review submitted successfully!</p>
              <p className="text-xs opacity-90">Your review will be visible on the product page shortly.</p>
            </div>
          </div>

          {/* Product & Submitted Rating Summary */}
          <div className="p-4 rounded-xl bg-bg-subtle border border-border-default space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-bg-surface border border-border-default overflow-hidden shrink-0 flex items-center justify-center">
                {productImage ? (
                  <img src={productImage} alt={productName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl" aria-hidden="true">
                    🎨
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold text-sm text-text-primary truncate">{productName}</p>
                <p className="text-xs text-text-tertiary">Verified purchase</p>
              </div>
            </div>

            <div className="pt-2 border-t border-border-default/60 flex items-center justify-between">
              <span className="text-xs font-heading font-semibold text-text-secondary">Your Rating</span>
              <div className="flex items-center gap-2">
                <RatingStars rating={rating} size="sm" />
                <span className="text-xs font-medium text-text-secondary">
                  {rating} out of 5 stars
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 2. Form States (Default, Loading, Error) */
        <form id="review-modal-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Error Alert Banner (Figma Variant 43:52337) */}
          {(isError || error) && (
            <AlertBanner
              variant="danger"
              size="sm"
              title={error || "Couldn't submit your review"}
              description="Please check your connection or review fields and try again."
              data-testid="review-error-banner"
            />
          )}

          {/* Validation Prompt Banner */}
          {showValidationAlert && !error && (
            <AlertBanner
              variant="warning"
              size="sm"
              description="Please select a rating and complete your review before submitting."
              data-testid="review-validation-banner"
            />
          )}

          {/* Product Context Row (Figma Component Property: Show Product Context) */}
          {showProductContext && (
            <div
              className="flex items-center gap-3 p-3 rounded-xl bg-bg-subtle border border-border-default"
              data-testid="review-product-context"
            >
              <div className="w-9 h-9 rounded-md bg-bg-surface border border-border-default overflow-hidden shrink-0 flex items-center justify-center">
                {productImage ? (
                  <img src={productImage} alt={productName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg" aria-hidden="true">
                    🎨
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold text-xs sm:text-sm text-text-primary truncate">
                  {productName}
                </p>
                <p className="text-[11px] text-text-tertiary">Purchased product</p>
              </div>
            </div>
          )}

          {/* Star Rating Selection */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-heading font-semibold text-text-primary block">
              Rating <span className="text-status-danger-accent">*</span>
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <RatingStars
                interactive={!isLoading}
                rating={rating}
                onRatingChange={setRating}
                size="md"
              />
              <span
                className={cn(
                  'text-xs font-medium',
                  rating > 0 ? 'text-text-secondary' : 'text-text-tertiary'
                )}
                data-testid="rating-feedback-label"
              >
                {RATING_LABELS[rating] || `${rating} out of 5 stars`}
              </span>
            </div>
          </div>

          {/* Review Title Input */}
          <TextInput
            label={
              <span>
                Review Title <span className="text-text-tertiary font-normal">(Optional)</span>
              </span>
            }
            size="md"
            disabled={isLoading}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Beautiful mindful illustrations!"
            maxLength={150}
            data-testid="review-title-input"
          />

          {/* Review Body Textarea */}
          <Textarea
            label={
              <span>
                Your Review <span className="text-text-tertiary font-normal">(Optional)</span>
              </span>
            }
            size="md"
            resize="none"
            disabled={isLoading}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Tell us what you liked, what stood out, or what could be better..."
            maxLength={2000}
            data-testid="review-body-textarea"
          />
        </form>
      )}
    </Modal>
  );
}
