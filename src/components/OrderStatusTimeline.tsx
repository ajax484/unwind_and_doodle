'use client';

import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { OrderStatus } from '@/lib/supabase/types';

/**
 * Root card container variants for OrderStatusTimeline conforming to Figma 43:42961.
 */
export const orderStatusTimelineVariants = cva(
  'bg-bg-surface border border-border-default rounded-[24px] shadow-card transition-all duration-150 flex flex-col',
  {
    variants: {
      size: {
        sm: 'p-5 gap-4',
        md: 'p-7 gap-5',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export type OrderStatusTimelineSize = NonNullable<
  VariantProps<typeof orderStatusTimelineVariants>['size']
>;

export type OrderStatusTimelineOrientation = 'horizontal' | 'vertical';

export interface OrderStatusHistoryItem {
  status: OrderStatus | string;
  note?: string | null;
  createdAt: string;
}

export interface OrderStatusTimelineProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof orderStatusTimelineVariants> {
  /** Current lifecycle status of the order. */
  status: OrderStatus | string;
  /** Activity audit log history for chronological timestamps and status notes. */
  history?: OrderStatusHistoryItem[];
  /** Timeline layout orientation ('horizontal' for desktop ribbon, 'vertical' for mobile stepper). */
  orientation?: OrderStatusTimelineOrientation;
  /** Timeline scale variant ('sm' = compact, 'md' = standard). */
  size?: OrderStatusTimelineSize;
  /** Whether the integrated status alert banner is displayed at the top of the card. */
  showAlertBanner?: boolean;
  /** Optional heading title displayed on the card (defaults to 'Order Status Timeline'). */
  title?: string;
  /** Whether the card heading title is rendered. */
  showCardTitle?: boolean;
  /** Custom alert banner title override. */
  bannerTitle?: string;
  /** Custom alert banner description copy override. */
  bannerDescription?: string;
  /** Test identifier attribute for testing libraries. */
  'data-testid'?: string;
}

interface StepDefinition {
  key: string;
  statusMatch: string[];
  label: string;
  subtitle: string;
  rank: number;
}

const CANONICAL_STEPS: StepDefinition[] = [
  {
    key: 'created',
    statusMatch: ['created'],
    label: 'Created',
    subtitle: 'Order placed',
    rank: 1,
  },
  {
    key: 'pending',
    statusMatch: ['pending'],
    label: 'Pending',
    subtitle: 'Payment verified',
    rank: 2,
  },
  {
    key: 'confirmed',
    statusMatch: ['confirmed'],
    label: 'Confirmed',
    subtitle: 'Processing & packing',
    rank: 3,
  },
  {
    key: 'shipped',
    statusMatch: ['shipped'],
    label: 'Shipped',
    subtitle: 'On the way',
    rank: 4,
  },
  {
    key: 'delivered',
    statusMatch: ['received', 'delivered'],
    label: 'Delivered',
    subtitle: 'Delivered to customer',
    rank: 5,
  },
];

const STATUS_RANKS: Record<string, number> = {
  created: 1,
  pending: 2,
  confirmed: 3,
  shipped: 4,
  received: 5,
  delivered: 5,
  cancelled: -1,
  refunded: -2,
};

/**
 * Format timestamp into human-readable date or micro-timestamp.
 */
function formatStepDate(isoString?: string): string | null {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return null;
  }
}

function formatStepTime(isoString?: string): string | null {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

/**
 * OrderStatusTimeline
 *
 * Canonical order progression timeline reconciling Figma component set `43:42961`
 * and documentation board `43:46692`. Supports both Horizontal progression ribbons
 * and Vertical multi-step steppers across SM and MD sizes, integrated alert banners,
 * and high-contrast accessible indicators.
 */
export const OrderStatusTimeline = forwardRef<HTMLDivElement, OrderStatusTimelineProps>(
  (
    {
      status,
      history = [],
      orientation = 'horizontal',
      size = 'md',
      showAlertBanner,
      title = 'Order Status Timeline',
      showCardTitle = true,
      bannerTitle,
      bannerDescription,
      className,
      'data-testid': testId = 'order-status-timeline',
      ...rest
    },
    ref
  ) => {
    const normalizedStatus = String(status || '').toLowerCase();
    const isCancelled = normalizedStatus === 'cancelled';
    const isRefunded = normalizedStatus === 'refunded';
    const isDelivered = normalizedStatus === 'received' || normalizedStatus === 'delivered';

    const currentRank = STATUS_RANKS[normalizedStatus] ?? 1;

    // Determine banner visibility: explicitly set, or defaulted to true on cancelled/refunded
    const shouldShowBanner =
      showAlertBanner !== undefined ? showAlertBanner : isCancelled || isRefunded;

    // Determine halted rank for cancelled / refunded orders from history or fallback to rank 3 (confirmed)
    let haltedStepIndex = 2; // default to confirmed
    if (isCancelled || isRefunded) {
      if (history.length > 1) {
        const priorItem = history[history.length - 2];
        const priorRank = STATUS_RANKS[String(priorItem?.status).toLowerCase()];
        if (priorRank && priorRank > 0) {
          haltedStepIndex = priorRank - 1;
        }
      }
    }

    // Map history timestamps to each canonical step
    const stepTimestamps: Record<string, string | undefined> = {};
    for (const h of history) {
      const hStatus = String(h.status).toLowerCase();
      for (const step of CANONICAL_STEPS) {
        if (step.statusMatch.includes(hStatus) && !stepTimestamps[step.key]) {
          stepTimestamps[step.key] = h.createdAt;
        }
      }
    }

    // Indicator dimensions based on size
    const indicatorSizeClass = size === 'sm' ? 'w-[26px] h-[26px]' : 'w-8 h-8';
    const activeDotSizeClass = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';
    const upcomingDotSizeClass = size === 'sm' ? 'w-1.5 h-1.5' : 'w-[7px] h-[7px]';
    const checkIconSize = size === 'sm' ? 12 : 14;
    const progressLineHeight = size === 'sm' ? 'h-[2px]' : 'h-[3px]';
    const progressLineWidth = size === 'sm' ? 'w-[2px]' : 'w-[3px]';

    return (
      <div
        ref={ref}
        data-testid={testId}
        className={cn(orderStatusTimelineVariants({ size }), className)}
        {...rest}
      >
        {/* Card Header Title */}
        {showCardTitle && (
          <h3 className="font-heading font-semibold text-lg text-text-primary leading-tight">
            {title}
          </h3>
        )}

        {/* Integrated Alert Banner */}
        {shouldShowBanner && (
          <div
            role="alert"
            className={cn(
              'flex items-start gap-3 p-3 sm:p-3.5 rounded-[14px] border transition-all',
              isCancelled
                ? 'bg-status-danger-bg border-status-danger-accent/40 text-status-danger-text'
                : isRefunded
                ? 'bg-bg-brand border-border-brand text-text-brand'
                : isDelivered
                ? 'bg-status-success-bg border-status-success-accent/40 text-status-success-text'
                : 'bg-bg-brand border-border-brand text-text-primary'
            )}
          >
            {/* Banner Vector Icon */}
            <div className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5" aria-hidden="true">
              {isCancelled ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : isRefunded ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
              ) : isDelivered ? (
                <svg className="w-4 h-4 text-status-success-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-brand-blue-deep" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              )}
            </div>

            {/* Banner Text Content */}
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-body font-semibold text-sm leading-tight">
                {bannerTitle ||
                  (isCancelled
                    ? 'Order cancelled'
                    : isRefunded
                    ? 'Order refunded'
                    : isDelivered
                    ? 'Order delivered'
                    : 'Fulfillment in progress')}
              </span>
              <span className="font-body font-medium text-xs opacity-90 leading-normal">
                {bannerDescription ||
                  (isCancelled
                    ? 'This order is no longer being processed.'
                    : isRefunded
                    ? 'Your refund has been processed.'
                    : isDelivered
                    ? 'Package received and completed.'
                    : 'Dispatched and tracked via fulfillment pipeline.')}
              </span>
            </div>
          </div>
        )}

        {/* Timeline Content */}
        {orientation === 'horizontal' ? (
          /* =========================================================================
             HORIZONTAL PROGRESSION RIBBON (Figma Step 5B Horizontal)
             ========================================================================= */
          <div className="w-full overflow-x-auto py-1">
            <div className="flex items-start justify-between min-w-[340px] w-full">
              {CANONICAL_STEPS.map((step, idx) => {
                const stepRank = step.rank;
                const isStepCompleted =
                  !isCancelled && !isRefunded
                    ? currentRank > stepRank
                    : idx < haltedStepIndex;

                const isStepCurrent =
                  !isCancelled && !isRefunded
                    ? currentRank === stepRank
                    : false;

                const isStepCancelledHalted =
                  (isCancelled || isRefunded) && idx === haltedStepIndex;

                const isStepUpcoming =
                  !isStepCompleted && !isStepCurrent && !isStepCancelledHalted;

                const dateStr = formatStepDate(stepTimestamps[step.key]);

                return (
                  <React.Fragment key={step.key}>
                    {/* Step Column */}
                    <div className="flex flex-col items-center text-center shrink-0 min-w-[60px] sm:min-w-[70px]">
                      {/* Step Indicator */}
                      <div
                        className={cn(
                          'rounded-full flex items-center justify-center transition-all duration-150 select-none shrink-0',
                          indicatorSizeClass,
                          isStepCompleted
                            ? 'bg-brand-rose text-text-inverse'
                            : isStepCurrent
                            ? 'bg-brand-rose border-[3px] border-brand-blue ring-2 ring-brand-blue/30'
                            : isStepCancelledHalted
                            ? 'bg-status-danger-text text-text-inverse'
                            : 'bg-bg-subtle border-[1.5px] border-border-default'
                        )}
                        aria-label={`${step.label}: ${
                          isStepCompleted
                            ? 'Completed'
                            : isStepCurrent
                            ? 'Current'
                            : isStepCancelledHalted
                            ? 'Cancelled'
                            : 'Upcoming'
                        }`}
                      >
                        {isStepCompleted ? (
                          <svg
                            width={checkIconSize}
                            height={checkIconSize}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : isStepCurrent ? (
                          <span
                            className={cn('rounded-full bg-text-inverse', activeDotSizeClass)}
                            aria-hidden="true"
                          />
                        ) : isStepCancelledHalted ? (
                          <svg
                            width={checkIconSize}
                            height={checkIconSize}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        ) : (
                          <span
                            className={cn('rounded-full bg-border-default', upcomingDotSizeClass)}
                            aria-hidden="true"
                          />
                        )}
                      </div>

                      {/* Step Label */}
                      <span
                        className={cn(
                          'font-body text-xs sm:text-sm mt-2 transition-colors',
                          isStepCurrent
                            ? 'font-semibold text-text-primary'
                            : isStepCompleted
                            ? 'font-medium text-text-primary'
                            : isStepCancelledHalted
                            ? 'font-semibold text-status-danger-text'
                            : 'font-normal text-text-tertiary'
                        )}
                      >
                        {step.label}
                      </span>

                      {/* Micro-Timestamp */}
                      {dateStr && (
                        <span className="font-body text-[11px] text-text-tertiary mt-0.5">
                          {dateStr}
                        </span>
                      )}
                    </div>

                    {/* Connecting Line Segment (between step pairs) */}
                    {idx < CANONICAL_STEPS.length - 1 && (
                      <div
                        className={cn(
                          'flex-1 flex items-center self-start mt-[14px] sm:mt-[15px] px-1',
                          size === 'sm' ? 'mt-[11px] sm:mt-[12px]' : ''
                        )}
                      >
                        <div
                          className={cn(
                            'w-full rounded-full transition-all duration-300',
                            progressLineHeight,
                            isStepCompleted
                              ? 'bg-brand-rose'
                              : 'bg-border-default'
                          )}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        ) : (
          /* =========================================================================
             VERTICAL STEPPER (Figma Step 5B Vertical / Mobile)
             ========================================================================= */
          <div className="flex flex-col w-full py-1">
            {CANONICAL_STEPS.map((step, idx) => {
              const stepRank = step.rank;
              const isStepCompleted =
                !isCancelled && !isRefunded
                  ? currentRank > stepRank
                  : idx < haltedStepIndex;

              const isStepCurrent =
                !isCancelled && !isRefunded
                  ? currentRank === stepRank
                  : false;

              const isStepCancelledHalted =
                (isCancelled || isRefunded) && idx === haltedStepIndex;

              const isStepUpcoming =
                !isStepCompleted && !isStepCurrent && !isStepCancelledHalted;

              const dateStr = formatStepDate(stepTimestamps[step.key]);
              const timeStr = formatStepTime(stepTimestamps[step.key]);
              const fullTimeDisplay =
                dateStr && timeStr ? `${dateStr}, ${timeStr}` : dateStr || null;

              const isLast = idx === CANONICAL_STEPS.length - 1;

              return (
                <div key={step.key} className="flex items-start gap-4">
                  {/* Indicator Column */}
                  <div className="flex flex-col items-center shrink-0">
                    {/* Indicator Circle */}
                    <div
                      className={cn(
                        'rounded-full flex items-center justify-center transition-all duration-150 select-none shrink-0',
                        indicatorSizeClass,
                        isStepCompleted
                          ? 'bg-brand-rose text-text-inverse'
                          : isStepCurrent
                          ? 'bg-brand-rose border-[3px] border-brand-blue ring-2 ring-brand-blue/30'
                          : isStepCancelledHalted
                          ? 'bg-status-danger-text text-text-inverse'
                          : 'bg-bg-subtle border-[1.5px] border-border-default'
                      )}
                      aria-label={`${step.label}: ${
                        isStepCompleted
                          ? 'Completed'
                          : isStepCurrent
                          ? 'Current'
                          : isStepCancelledHalted
                          ? 'Cancelled'
                          : 'Upcoming'
                      }`}
                    >
                      {isStepCompleted ? (
                        <svg
                          width={checkIconSize}
                          height={checkIconSize}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : isStepCurrent ? (
                        <span
                          className={cn('rounded-full bg-text-inverse', activeDotSizeClass)}
                          aria-hidden="true"
                        />
                      ) : isStepCancelledHalted ? (
                        <svg
                          width={checkIconSize}
                          height={checkIconSize}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      ) : (
                        <span
                          className={cn('rounded-full bg-border-default', upcomingDotSizeClass)}
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    {/* Vertical Progress Line (Omitted on final step) */}
                    {!isLast && (
                      <div
                        className={cn(
                          'rounded-full my-1 transition-all duration-300',
                          size === 'sm' ? 'h-7' : 'h-9',
                          progressLineWidth,
                          isStepCompleted ? 'bg-brand-rose' : 'bg-border-default'
                        )}
                      />
                    )}
                  </div>

                  {/* Content Column */}
                  <div className="flex flex-col gap-0.5 pt-1 pb-4 min-w-0">
                    <span
                      className={cn(
                        'font-body text-sm leading-tight transition-colors',
                        isStepCurrent
                          ? 'font-semibold text-text-primary'
                          : isStepCompleted
                          ? 'font-medium text-text-primary'
                          : isStepCancelledHalted
                          ? 'font-semibold text-status-danger-text'
                          : 'font-normal text-text-tertiary'
                      )}
                    >
                      {step.label}
                    </span>

                    {fullTimeDisplay ? (
                      <span className="font-body text-xs text-text-tertiary">
                        {fullTimeDisplay}
                      </span>
                    ) : (
                      <span className="font-body text-xs text-text-tertiary">
                        {step.subtitle}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Audit Activity Log (Preserved for full backend activity transparency) */}
        {history && history.length > 0 && (
          <div className="border-t border-border-default pt-4 flex flex-col gap-2.5">
            <span className="font-heading font-semibold text-xs uppercase tracking-wider text-text-tertiary">
              Activity Log
            </span>

            <div className="flex flex-col gap-2">
              {history.map((item, index) => (
                <div
                  key={`${item.status}-${index}`}
                  className="flex items-start justify-between text-xs text-text-secondary gap-2"
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium capitalize text-text-primary">
                      {String(item.status).replace('_', ' ')}
                    </span>
                    {item.note && (
                      <span className="text-text-tertiary">— {item.note}</span>
                    )}
                  </div>

                  <span className="font-body text-[11px] text-text-tertiary shrink-0">
                    {new Date(item.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

OrderStatusTimeline.displayName = 'OrderStatusTimeline';

export default OrderStatusTimeline;
