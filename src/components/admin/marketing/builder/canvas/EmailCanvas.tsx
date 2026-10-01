'use client';

import React from 'react';
import {
  V1CampaignBlock,
  V1CampaignBlockType,
  V1TextBlock,
  V1ImageBlock,
  V1ProductBlock,
  V1ProductGridBlock,
  V1ButtonBlock,
  V1CalloutBlock,
  V1DividerBlock,
} from '@/types/marketing-builder';
import { BlockWrapper } from './BlockWrapper';
import { BlockInserter } from './BlockInserter';
import {
  CanvasTextBlock,
  CanvasImageBlock,
  CanvasProductBlock,
  CanvasProductGridBlock,
  CanvasButtonBlock,
  CanvasCalloutBlock,
  CanvasDividerBlock,
} from './blocks/CanvasBlocks';

export interface EmailCanvasProps {
  blocks: V1CampaignBlock[];
  selectedBlockId: string | null;
  viewport: 'desktop' | 'mobile';
  senderName: string;
  senderEmail: string;
  subject: string;
  previewText?: string;
  onSelectBlock: (id: string | null) => void;
  onInsertBlock: (type: V1CampaignBlockType, index: number) => void;
  onMoveBlock: (index: number, direction: 'up' | 'down') => void;
  onDuplicateBlock: (index: number) => void;
  onDeleteBlock: (index: number) => void;
}

export function EmailCanvas({
  blocks,
  selectedBlockId,
  viewport,
  senderName,
  senderEmail,
  subject,
  previewText,
  onSelectBlock,
  onInsertBlock,
  onMoveBlock,
  onDuplicateBlock,
  onDeleteBlock,
}: EmailCanvasProps) {
  const containerMaxWidth = viewport === 'mobile' ? 'max-w-[375px]' : 'max-w-[600px]';

  const renderBlockItem = (block: V1CampaignBlock) => {
    switch (block.type) {
      case 'text':
        return <CanvasTextBlock block={block as V1TextBlock} />;
      case 'image':
        return <CanvasImageBlock block={block as V1ImageBlock} />;
      case 'product':
        return <CanvasProductBlock block={block as V1ProductBlock} />;
      case 'product_grid':
        return <CanvasProductGridBlock block={block as V1ProductGridBlock} />;
      case 'button':
        return <CanvasButtonBlock block={block as V1ButtonBlock} />;
      case 'callout':
        return <CanvasCalloutBlock block={block as V1CalloutBlock} />;
      case 'divider':
        return <CanvasDividerBlock block={block as V1DividerBlock} />;
      default:
        return null;
    }
  };

  return (
    <div
      onClick={() => onSelectBlock(null)}
      className="flex-1 bg-bg-subtle/50 overflow-y-auto p-4 sm:p-8 flex justify-center items-start h-full"
    >
      <div
        className={`w-full ${containerMaxWidth} transition-all duration-300 bg-white rounded-2xl shadow-lg border border-border-default overflow-hidden flex flex-col my-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Email Client Envelope Header */}
        <div className="bg-slate-50 border-b border-border-default p-4 text-xs space-y-2">
          <div className="flex items-center justify-between text-text-secondary">
            <div>
              <span className="font-semibold text-text-tertiary mr-1.5">From:</span>
              <span className="font-bold text-text-primary">
                {senderName || 'Unwind & Doodle'}{' '}
                <span className="font-normal text-text-tertiary">
                  &lt;{senderEmail || 'no-reply@unwindanddoodle.com'}&gt;
                </span>
              </span>
            </div>
          </div>

          <div className="pt-1">
            <div className="font-bold text-sm text-text-primary font-heading break-words">
              {subject ? subject : <span className="text-text-placeholder italic">(No subject line)</span>}
            </div>
            {previewText && (
              <div className="text-[11px] text-text-tertiary italic mt-0.5 break-words">
                {previewText}
              </div>
            )}
          </div>
        </div>

        {/* Brand Logo Header */}
        <div className="pt-6 pb-2 text-center flex flex-col items-center justify-center">
          <img
            src="/logo.svg"
            alt="Unwind & Doodle"
            className="w-12 h-12 object-contain mx-auto mb-1.5"
          />
          <div className="inline-block px-3 py-0.5 bg-brand-rose/10 text-brand-rose-deep rounded-full text-[11px] font-bold tracking-wider uppercase">
            Unwind &amp; Doodle
          </div>
        </div>

        {/* Canvas Body with Blocks */}
        <div className="px-6 py-2 flex flex-col">
          {blocks.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-border-default rounded-2xl my-4 bg-bg-subtle/30">
              <span className="text-3xl block mb-2 opacity-60">✉️</span>
              <h4 className="font-bold font-heading text-text-primary text-sm">
                Your Email Canvas is Empty
              </h4>
              <p className="text-xs text-text-tertiary max-w-xs mx-auto mt-1 mb-4">
                Add blocks from the left panel or click below to start composing.
              </p>
              <BlockInserter index={0} onInsert={(type) => onInsertBlock(type, 0)} />
            </div>
          ) : (
            <>
              {/* Inserter before first block */}
              <BlockInserter index={0} onInsert={(type) => onInsertBlock(type, 0)} />

              {blocks.map((block, index) => {
                const isSelected = selectedBlockId === block.id;

                return (
                  <React.Fragment key={block.id}>
                    <BlockWrapper
                      block={block}
                      isSelected={isSelected}
                      canMoveUp={index > 0}
                      canMoveDown={index < blocks.length - 1}
                      onSelect={() => onSelectBlock(block.id)}
                      onMoveUp={() => onMoveBlock(index, 'up')}
                      onMoveDown={() => onMoveBlock(index, 'down')}
                      onDuplicate={() => onDuplicateBlock(index)}
                      onDelete={() => onDeleteBlock(index)}
                    >
                      {renderBlockItem(block)}
                    </BlockWrapper>

                    {/* Inserter after each block */}
                    <BlockInserter
                      index={index + 1}
                      onInsert={(type) => onInsertBlock(type, index + 1)}
                    />
                  </React.Fragment>
                );
              })}
            </>
          )}
        </div>

        {/* Standard Email Footer */}
        <div className="mt-8 p-6 bg-slate-50 border-t border-border-default text-center text-xs text-text-tertiary space-y-1">
          <p className="font-semibold text-text-secondary">Unwind &amp; Doodle • Abuja, Nigeria</p>
          <p className="text-[11px]">
            You received this email because you subscribed to our creative updates.
          </p>
          <p className="text-[11px] pt-1">
            <span className="underline hover:text-text-primary cursor-pointer">
              Unsubscribe from marketing emails
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
