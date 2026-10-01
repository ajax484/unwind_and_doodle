'use client';

import React from 'react';
import {
  V1TextBlock,
  V1ImageBlock,
  V1ProductBlock,
  V1ProductGridBlock,
  V1ButtonBlock,
  V1CalloutBlock,
  V1DividerBlock,
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
  const {
    title = 'Featured Product',
    price,
    imageUrl,
    badge,
    description,
    ctaText = 'Preorder Now',
    showPrice = true,
    showDescription = true,
    showCta = true,
  } = block.data || {};

  return (
    <div className="rounded-xl border border-border-default p-4 bg-[#FFFDF7] shadow-sm flex flex-col sm:flex-row items-center gap-4 my-2">
      {imageUrl ? (
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden border border-border-default bg-white flex-shrink-0 flex items-center justify-center">
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg border border-border-default bg-bg-subtle flex-shrink-0 flex items-center justify-center text-2xl opacity-40">
          🎨
        </div>
      )}

      <div className="flex-1 min-w-0 text-center sm:text-left">
        {badge && (
          <span className="inline-block px-2 py-0.5 mb-1.5 bg-brand-rose/15 text-brand-rose font-bold text-[11px] rounded-md uppercase tracking-wider">
            {badge}
          </span>
        )}
        <div className="font-bold text-text-primary text-base truncate">{title}</div>
        {showDescription && description && (
          <p className="text-xs text-text-secondary line-clamp-2 mt-1 leading-relaxed">
            {description}
          </p>
        )}
        {showPrice && price !== undefined && (
          <div className="font-extrabold text-brand-rose text-sm mt-1.5">
            {formatPrice(price)}
          </div>
        )}
        {showCta && (
          <div className="mt-3">
            <span className="inline-block px-4 py-1.5 rounded-lg bg-brand-rose text-white text-xs font-bold shadow-sm">
              {ctaText}
            </span>
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
          {products.map((item, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-border-default p-3 bg-white text-center flex flex-col items-center justify-between"
            >
              <div className="w-full h-24 rounded-lg bg-bg-subtle overflow-hidden mb-2 flex items-center justify-center border border-border-default">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl opacity-30">🎨</span>
                )}
              </div>
              <div className="w-full">
                <div className="text-xs font-semibold text-text-primary truncate">
                  {item.title || 'Product'}
                </div>
                {item.price !== undefined && (
                  <div className="text-xs font-bold text-brand-rose mt-0.5">
                    {formatPrice(item.price)}
                  </div>
                )}
                <span className="inline-block mt-2 px-2.5 py-1 rounded-md bg-brand-rose/10 text-brand-rose text-[11px] font-bold">
                  View Item
                </span>
              </div>
            </div>
          ))}
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

// 7. Divider Block
export function CanvasDividerBlock({ block }: { block: V1DividerBlock }) {
  const spacing = block.data?.spacing || 'md';
  const pyClass = spacing === 'sm' ? 'py-2' : spacing === 'lg' ? 'py-6' : 'py-4';

  return (
    <div className={`w-full ${pyClass}`}>
      <hr className="border-0 border-t border-border-default w-full" />
    </div>
  );
}
