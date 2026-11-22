'use client';

import React from 'react';
import {
  V1TextBlock,
  V1ImageBlock,
  V1ProductBlock,
  V1ProductGridBlock,
  V1ReviewBlock,
  V1DynamicItemsBlock,
  V1ButtonBlock,
  V1CalloutBlock,
  V1DividerBlock,
  normalizeProductPresentation,
  SAMPLE_DYNAMIC_CART_ITEMS,
  SAMPLE_DYNAMIC_ORDER_ITEMS,
} from '@/types/marketing-builder';
import { formatPrice } from '@/lib/format-utils';

function renderTextWithTokenHighlights(text: string) {
  if (!text) return <span className="text-text-placeholder italic">Empty text block</span>;

  // Split text by tokens like {{token_name}}
  const parts = text.split(/(\{\{[a-zA-Z0-9_]+\}\})/g);

  return parts.map((part, idx) => {
    if (part.startsWith('{{') && part.endsWith('}}')) {
      const tokenKey = part.replace(/^\{\{|\}\}$/g, '');
      const prettyLabel = tokenKey.replace(/_/g, ' ');
      return (
        <span
          key={idx}
          className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-brand-rose/15 text-brand-rose font-semibold text-xs border border-brand-rose/30 align-baseline"
          title={`Personalization Token: ${part}`}
        >
          ✨ {prettyLabel}
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

// 1. Text Block
export function CanvasTextBlock({ block }: { block: V1TextBlock }) {
  const { content = '', style = 'body', align = 'left' } = block.data || {};

  const alignClass =
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

  if (style === 'heading') {
    return (
      <div className={`font-bold font-heading text-xl sm:text-2xl text-text-primary ${alignClass} py-1`}>
        {renderTextWithTokenHighlights(content)}
      </div>
    );
  }

  if (style === 'small') {
    return (
      <div className={`text-xs text-text-secondary leading-relaxed ${alignClass} py-1`}>
        {renderTextWithTokenHighlights(content)}
      </div>
    );
  }

  if (content.trim() === '{{itemsTable}}') {
    return (
      <div className="my-2 border border-border-default rounded-xl overflow-hidden bg-bg-surface text-xs">
        <div className="bg-bg-subtle px-3 py-2 border-b border-border-default flex items-center justify-between font-semibold text-text-secondary text-[11px]">
          <span>Order Items (Dynamic Section)</span>
          <span className="text-brand-rose font-mono text-[10px]">{"{{itemsTable}}"}</span>
        </div>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border-default text-text-tertiary">
              <th className="p-2.5 font-medium">Item</th>
              <th className="p-2.5 font-medium">Qty</th>
              <th className="p-2.5 font-medium text-right">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default text-text-primary">
            <tr>
              <td className="p-2.5">Bleed-resistant Sketchbook A4</td>
              <td className="p-2.5">2</td>
              <td className="p-2.5 text-right font-semibold">₦15,000</td>
            </tr>
            <tr>
              <td className="p-2.5">Pastel Watercolor Palette</td>
              <td className="p-2.5">1</td>
              <td className="p-2.5 text-right font-semibold">₦12,500</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={`text-sm text-text-primary leading-relaxed ${alignClass} py-1 whitespace-pre-wrap`}>
      {renderTextWithTokenHighlights(content)}
    </div>
  );
}

// 2. Image Block
export function CanvasImageBlock({ block }: { block: V1ImageBlock }) {
  const {
    url,
    alt,
    altText,
    caption,
    width = 'full',
    align = 'center',
  } = block.data || {};

  const alignClass =
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

  const widthStyle = width === 'constrained' ? { maxWidth: '360px' } : { width: '100%', maxWidth: '560px' };

  if (!url) {
    return (
      <div className="border-2 border-dashed border-border-default rounded-xl p-8 text-center bg-bg-subtle/40 hover:bg-bg-subtle transition-colors cursor-pointer">
        <span className="text-3xl block mb-2 opacity-50">🖼️</span>
        <div className="text-xs font-semibold text-text-secondary">Image Block (Empty)</div>
        <div className="text-[11px] text-text-tertiary mt-0.5">
          Select image or upload from Media Library in inspector
        </div>
      </div>
    );
  }

  return (
    <div className={`py-2 ${alignClass}`}>
      <img
        src={url}
        alt={altText || alt || 'Image'}
        className={`h-auto rounded-xl border border-border-default inline-block ${
          align === 'center' ? 'mx-auto' : ''
        }`}
        style={{ ...widthStyle, maxHeight: '450px', objectFit: 'contain' }}
      />
      {caption && (
        <p className={`text-xs text-text-tertiary mt-1.5 ${alignClass}`}>{caption}</p>
      )}
    </div>
  );
}

// 3. Product Block
export function CanvasProductBlock({ block }: { block: V1ProductBlock }) {
  const presentation = normalizeProductPresentation(block.data || {});
  const { image, badge, title, description, price, cta, _catalogSnapshot } = presentation;

  const imageUrl = image?.url || _catalogSnapshot?.imageUrl;
  const displayTitle = title?.text || _catalogSnapshot?.title || 'Featured Product';
  const displayPrice = _catalogSnapshot?.price;
  const displayDescription = description?.text || _catalogSnapshot?.description;
  const displayBadge = badge?.text;

  return (
    <div className="rounded-xl border border-border-default p-4 bg-[#FFFDF7] shadow-sm flex flex-col sm:flex-row items-center gap-4 my-2">
      {imageUrl ? (
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden border border-border-default bg-white flex-shrink-0 flex items-center justify-center">
          <img src={imageUrl} alt={displayTitle} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg border border-dashed border-border-default bg-bg-subtle flex-shrink-0 flex flex-col items-center justify-center p-2 text-center text-xs text-text-tertiary">
          <span className="text-xl mb-0.5 opacity-40">🎨</span>
          <span className="text-[10px]">No image</span>
        </div>
      )}

      <div className="flex-1 min-w-0 text-center sm:text-left">
        {badge?.visible && displayBadge && (
          <span className="inline-block px-2 py-0.5 mb-1.5 bg-brand-rose/15 text-brand-rose font-bold text-[11px] rounded-md uppercase tracking-wider">
            {displayBadge}
          </span>
        )}

        {title?.visible !== false && (
          <div className="font-bold text-text-primary text-base truncate">
            {displayTitle}
          </div>
        )}

        {description?.visible && displayDescription && (
          <p className="text-xs text-text-secondary line-clamp-2 mt-1 leading-relaxed">
            {displayDescription}
          </p>
        )}

        {price?.visible && displayPrice !== undefined && (
          <div className="font-extrabold text-brand-rose text-sm mt-1.5">
            {formatPrice(displayPrice)}
          </div>
        )}

        {cta?.visible && (
          <div className="mt-3">
            <span className="inline-block px-4 py-1.5 rounded-lg bg-brand-rose text-white text-xs font-bold shadow-sm">
              {cta.text || 'Shop now'}
            </span>
            {cta.destination?.type === 'custom' && cta.destination.url && (
              <span className="block text-[10px] text-text-tertiary mt-0.5 truncate max-w-[200px]">
                ↗ {cta.destination.url}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 4. Product Grid Block
export function CanvasProductGridBlock({ block }: { block: V1ProductGridBlock }) {
  const { heading, products = [] } = block.data || {};

  return (
    <div className="py-2">
      {heading && (
        <h4 className="text-sm font-bold font-heading text-text-primary text-center mb-3">
          {heading}
        </h4>
      )}

      {products.length === 0 ? (
        <div className="border-2 border-dashed border-border-default rounded-xl p-6 text-center bg-bg-subtle/30">
          <span className="text-2xl block mb-1 opacity-50">🛍️</span>
          <div className="text-xs font-semibold text-text-secondary">Product Grid (Empty)</div>
          <div className="text-[11px] text-text-tertiary mt-0.5">
            Select products in the settings panel to populate the grid
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {products.map((rawItem, idx) => {
            const item = normalizeProductPresentation(rawItem);
            const { image, badge, title, description, price, cta, _catalogSnapshot } = item;
            const itemImg = image?.url || _catalogSnapshot?.imageUrl;
            const itemTitle = title?.text || _catalogSnapshot?.title || 'Product';
            const itemPrice = _catalogSnapshot?.price;
            const itemDesc = description?.text || _catalogSnapshot?.description;
            const itemBadge = badge?.text;

            return (
              <div
                key={idx}
                className="rounded-xl border border-border-default p-3 bg-white text-center flex flex-col items-center justify-between"
              >
                <div className="w-full h-28 rounded-lg bg-bg-subtle overflow-hidden mb-2 flex items-center justify-center border border-border-default relative">
                  {itemImg ? (
                    <img src={itemImg} alt={itemTitle} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl opacity-30">🎨</span>
                  )}
                  {badge?.visible && itemBadge && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-brand-rose/90 text-white text-[9px] font-bold shadow-sm">
                      {itemBadge}
                    </span>
                  )}
                </div>

                <div className="w-full space-y-1">
                  {title?.visible !== false && (
                    <div className="text-xs font-semibold text-text-primary truncate">
                      {itemTitle}
                    </div>
                  )}

                  {description?.visible && itemDesc && (
                    <p className="text-[11px] text-text-secondary line-clamp-2 leading-tight">
                      {itemDesc}
                    </p>
                  )}

                  {price?.visible && itemPrice !== undefined && (
                    <div className="text-xs font-bold text-brand-rose mt-0.5">
                      {formatPrice(itemPrice)}
                    </div>
                  )}

                  {cta?.visible && (
                    <div className="pt-1">
                      <span className="inline-block px-3 py-1 rounded-md bg-brand-rose/10 text-brand-rose text-[11px] font-bold">
                        {cta.text || 'Shop now'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// 5. Button Block
export function CanvasButtonBlock({ block }: { block: V1ButtonBlock }) {
  const { text = 'Shop Now', align = 'center', style = 'rose' } = block.data || {};

  const alignClass =
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

  const isBlue = style === 'blue' || style === 'secondary';
  const bgClass = isBlue ? 'bg-brand-blue text-neutral-charcoal' : 'bg-brand-rose text-white';

  return (
    <div className={`py-3 ${alignClass}`}>
      <span
        className={`inline-block px-7 py-3 rounded-full font-bold text-sm shadow-sm hover:shadow-md transition-all ${bgClass}`}
      >
        {text}
      </span>
    </div>
  );
}

// 6. Callout Block
export function CanvasCalloutBlock({ block }: { block: V1CalloutBlock }) {
  const { title, message = '', variant = 'rose' } = block.data || {};

  let themeClasses = 'bg-brand-rose/10 border-brand-rose/30 text-brand-rose-deep';
  if (variant === 'blue') {
    themeClasses = 'bg-brand-blue/15 border-brand-blue/40 text-text-primary';
  } else if (variant === 'cream') {
    themeClasses = 'bg-[#FFFDF7] border-border-default text-text-primary';
  }

  return (
    <div className={`rounded-xl border p-4 my-2 text-sm leading-relaxed ${themeClasses}`}>
      {title && <div className="font-bold text-sm mb-1">{title}</div>}
      <div className="whitespace-pre-wrap">{renderTextWithTokenHighlights(message)}</div>
    </div>
  );
}

// 7. Customer Review Block
export function CanvasReviewBlock({ block }: { block: V1ReviewBlock }) {
  const {
    rating = 5,
    title,
    quote = '',
    authorName = 'Verified Customer',
    productName,
    verifiedBuyer = true,
    style = 'card',
  } = block.data || {};

  const clamped = Math.max(1, Math.min(5, Math.round(rating)));
  const stars = '★'.repeat(clamped) + '☆'.repeat(5 - clamped);

  let cardClasses = 'bg-[#FFFDF7] border-border-default';
  if (style === 'rose') {
    cardClasses = 'bg-brand-rose/10 border-brand-rose/30';
  } else if (style === 'minimal') {
    cardClasses = 'bg-white border-slate-200';
  }

  return (
    <div className={`rounded-xl border p-4 my-2 space-y-2 ${cardClasses}`}>
      <div className="text-amber-500 text-base tracking-widest leading-none">{stars}</div>
      {title && <div className="font-bold text-sm text-text-primary">{title}</div>}
      <p className="text-sm text-text-primary italic leading-relaxed">
        {quote ? <>&ldquo;{quote}&rdquo;</> : <span className="text-text-placeholder">Pick a review or enter a customer quote...</span>}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-text-primary">— {authorName}</span>
          {verifiedBuyer && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
              Verified Buyer
            </span>
          )}
        </div>
        {productName && (
          <span className="font-semibold text-brand-rose-deep">{productName} →</span>
        )}
      </div>
    </div>
  );
}

// 8. Dynamic Cart / Order Items Block
export function CanvasDynamicItemsBlock({ block }: { block: V1DynamicItemsBlock }) {
  const {
    source = 'abandoned_cart',
    heading,
    showImage = true,
    showPrice = true,
    showQuantity = true,
    showSubtotal = true,
    showCta = true,
    ctaText,
  } = block.data || {};

  const isCart = source === 'abandoned_cart';
  const sampleItems = isCart ? SAMPLE_DYNAMIC_CART_ITEMS : SAMPLE_DYNAMIC_ORDER_ITEMS;
  const displayHeading = heading || (isCart ? 'Items you left behind' : 'What you ordered');
  const displayCta = ctaText || (isCart ? 'Return to your cart' : 'View your order');
  const subtotal = sampleItems.reduce((sum, item) => sum + (item.totalPrice ?? item.unitPrice * item.quantity), 0);

  return (
    <div className="rounded-xl border border-border-default bg-[#FFFDF7] p-4 my-2 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-bold text-sm text-text-primary">{displayHeading}</div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-rose/15 text-brand-rose-deep">
          {isCart ? 'Dynamic • Cart' : 'Dynamic • Order'}
        </span>
      </div>

      <div className="divide-y divide-border-default">
        {sampleItems.map((item, idx) => (
          <div key={idx} className="py-2.5 flex items-center gap-3">
            {showImage && (
              <div className="w-14 h-14 rounded-lg border border-border-default bg-white overflow-hidden flex-shrink-0 flex items-center justify-center">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg">🎨</span>
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-text-primary truncate">{item.name}</div>
              {showQuantity && (
                <div className="text-[11px] text-text-secondary mt-0.5">
                  Qty: {item.quantity}
                  {showPrice && item.quantity > 1 ? ` (${formatPrice(item.unitPrice)} each)` : ''}
                </div>
              )}
            </div>
            {showPrice && (
              <div className="text-xs font-bold text-brand-rose-deep whitespace-nowrap">
                {formatPrice(item.totalPrice ?? item.unitPrice * item.quantity)}
              </div>
            )}
          </div>
        ))}
      </div>

      {showSubtotal && showPrice && (
        <div className="pt-2 border-t border-border-default flex items-center justify-between text-xs">
          <span className="font-bold text-text-secondary">Subtotal</span>
          <span className="font-extrabold text-sm text-text-primary">{formatPrice(subtotal)}</span>
        </div>
      )}

      {showCta && (
        <div className="pt-1 text-center">
          <span className="inline-block px-5 py-2 rounded-full bg-brand-rose text-white text-xs font-bold">
            {displayCta}
          </span>
        </div>
      )}
    </div>
  );
}

// 9. Divider Block
export function CanvasDividerBlock({ block }: { block: V1DividerBlock }) {
  const spacing = block.data?.spacing || 'md';
  const pyClass = spacing === 'sm' ? 'py-2' : spacing === 'lg' ? 'py-6' : 'py-4';

  return (
    <div className={`w-full ${pyClass}`}>
      <hr className="border-0 border-t border-border-default w-full" />
    </div>
  );
}
