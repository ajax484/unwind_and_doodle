'use client';

import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const skeletonVariants = cva('animate-pulse bg-bg-subtle select-none', {
  variants: {
    type: {
      text: 'rounded-full',
      image: 'rounded-[14px]',
      card: 'rounded-2xl border border-border-default/50 p-4 sm:p-5 flex flex-col',
      tableRow: 'rounded-md flex items-center gap-4 py-3 px-4 border-b border-border-default/40',
      custom: 'rounded-xl',
    },
    size: {
      sm: '',
      md: '',
      lg: '',
    },
  },
  compoundVariants: [
    // Text heights
    { type: 'text', size: 'sm', className: 'h-2.5' },
    { type: 'text', size: 'md', className: 'h-3.5' },
    { type: 'text', size: 'lg', className: 'h-5' },

    // Image dimensions
    { type: 'image', size: 'sm', className: 'w-[120px] h-[120px]' },
    { type: 'image', size: 'md', className: 'w-full max-w-[240px] h-[180px]' },
    { type: 'image', size: 'lg', className: 'w-full max-w-[360px] h-[240px]' },

    // Card dimensions
    { type: 'card', size: 'sm', className: 'w-full max-w-[240px]' },
    { type: 'card', size: 'md', className: 'w-full max-w-[320px]' },
    { type: 'card', size: 'lg', className: 'w-full max-w-[400px]' },
  ],
  defaultVariants: {
    type: 'text',
    size: 'md',
  },
});

export type SkeletonType = NonNullable<VariantProps<typeof skeletonVariants>['type']>;
export type SkeletonSize = NonNullable<VariantProps<typeof skeletonVariants>['size']>;

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  /** When type="text", specifies the number of staggered lines to render (1, 2, or 3). */
  lines?: 1 | 2 | 3;
  /** Test identifier attribute for testing libraries. */
  'data-testid'?: string;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ type = 'text', size = 'md', lines = 1, className, ...rest }, ref) => {
    if (type === 'text') {
      if (lines === 1) {
        return (
          <div
            ref={ref}
            className={cn(skeletonVariants({ type: 'text', size }), 'w-full', className)}
            aria-hidden="true"
            {...rest}
          />
        );
      }

      const gapClass = size === 'sm' ? 'gap-1.5' : 'gap-2';

      return (
        <div
          ref={ref}
          className={cn('flex flex-col w-full', gapClass, className)}
          aria-hidden="true"
          {...rest}
        >
          <div className={cn(skeletonVariants({ type: 'text', size }), 'w-full')} />
          <div className={cn(skeletonVariants({ type: 'text', size }), 'w-3/4')} />
          {lines === 3 && (
            <div className={cn(skeletonVariants({ type: 'text', size }), 'w-1/2')} />
          )}
        </div>
      );
    }

    if (type === 'image') {
      return (
        <div
          ref={ref}
          className={cn(skeletonVariants({ type: 'image', size }), className)}
          aria-hidden="true"
          {...rest}
        />
      );
    }

    if (type === 'card') {
      return (
        <div
          ref={ref}
          className={cn(
            skeletonVariants({ type: 'card', size }),
            'bg-bg-surface/80',
            className
          )}
          aria-hidden="true"
          {...rest}
        >
          <div className="w-full aspect-square rounded-xl bg-bg-subtle mb-4" />
          <div className="h-4 w-3/4 rounded-full bg-bg-subtle mb-2" />
          <div className="h-3 w-1/2 rounded-full bg-bg-subtle mb-4" />
          <div className="pt-3 border-t border-border-default/50 flex items-center justify-between mt-auto">
            <div className="h-4 w-1/3 rounded-full bg-bg-subtle" />
            <div className="h-7 w-16 rounded-full bg-bg-subtle" />
          </div>
        </div>
      );
    }

    if (type === 'tableRow') {
      return (
        <div
          ref={ref}
          className={cn(skeletonVariants({ type: 'tableRow', size }), 'w-full', className)}
          aria-hidden="true"
          {...rest}
        >
          <div className="h-3.5 w-1/4 rounded-full bg-border-default/60" />
          <div className="h-3.5 w-1/3 rounded-full bg-border-default/60" />
          <div className="h-3.5 w-1/6 rounded-full bg-border-default/60" />
          <div className="h-3.5 w-1/6 rounded-full bg-border-default/60" />
        </div>
      );
    }

    // Default custom placeholder block
    return (
      <div
        ref={ref}
        className={cn(skeletonVariants({ type: 'custom', size }), className)}
        aria-hidden="true"
        {...rest}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';
export default Skeleton;
