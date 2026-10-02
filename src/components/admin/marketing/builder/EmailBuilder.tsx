'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
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
import { MarketingCampaign, MarketingSegment } from '@/types/marketing';
import { V1_EMAIL_TEMPLATES, V1EmailTemplatePreset } from '@/lib/marketing-templates';
import { compileCampaignBlocksToHtml } from '@/services/marketing-renderer.service';
import { BuilderHeader } from './BuilderHeader';
import { ComponentPalette } from './panels/ComponentPalette';
import { ContextualSettings } from './panels/ContextualSettings';
import { EmailCanvas } from './canvas/EmailCanvas';
import { EmailPreviewDrawer } from './preview/EmailPreviewDrawer';
import { CampaignReviewModal } from './modals/CampaignReviewModal';
import { TestSendModal } from '../TestSendModal';

export interface EmailBuilderProps {
  initialCampaign?: MarketingCampaign | null;
}

function generateBlockId(type: string): string {
  return `blk_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

function createDefaultBlock(type: V1CampaignBlockType): V1CampaignBlock {
  const id = generateBlockId(type);
  switch (type) {
    case 'text':
      return {
        id,
        type: 'text',
        data: {
          content: 'Hi {{first_name}},\n\nWrite your message here...',
          style: 'body',
          align: 'left',
        },
      } as V1TextBlock;

    case 'image':
      return {
        id,
        type: 'image',
        data: {
          url: '',
          alt: 'Campaign Image',
          caption: '',
          linkUrl: '',
          align: 'center',
        },
      } as V1ImageBlock;

    case 'product':
      return {
        id,
        type: 'product',
        data: {
          productId: '',
          image: {
            url: '',
          },
          badge: {
            visible: false,
            text: '',
          },
          title: {
            visible: true,
            text: 'Select a Product',
          },
          description: {
            visible: true,
            text: '',
          },
          price: {
            visible: true,
          },
          cta: {
            visible: true,
            text: 'Shop now',
            destination: { type: 'product' },
          },
        },
      } as V1ProductBlock;

    case 'product_grid':
      return {
        id,
        type: 'product_grid',
        data: {
          heading: 'Featured Collection',
          products: [],
        },
      } as V1ProductGridBlock;

    case 'button':
      return {
        id,
        type: 'button',
        data: {
          text: 'Shop Now 🎀',
          url: '/products',
          style: 'rose',
          align: 'center',
        },
      } as V1ButtonBlock;

    case 'callout':
      return {
        id,
        type: 'callout',
        data: {
          title: 'Special Note ♡',
          message: 'Personalized message for {{first_name}}...',
          variant: 'rose',
        },
      } as V1CalloutBlock;

    case 'divider':
      return {
        id,
        type: 'divider',
        data: {
          spacing: 'md',
        },
      } as V1DividerBlock;
  }
}

export function EmailBuilder({ initialCampaign }: EmailBuilderProps) {
  const router = useRouter();

  // Campaign Identifiers & Metadata
  const [campaignId, setCampaignId] = useState<string | null>(initialCampaign?.id || null);
  const [name, setName] = useState<string>(initialCampaign?.name || 'Untitled Campaign');
  const [subject, setSubject] = useState<string>(initialCampaign?.subject || '');
  const [previewText, setPreviewText] = useState<string>(initialCampaign?.preview_text || '');
  const [senderName, setSenderName] = useState<string>(
    initialCampaign?.sender_name || 'Unwind & Doodle'
  );
  const [senderEmail, setSenderEmail] = useState<string>(
    initialCampaign?.sender_email || 'no-reply@unwindanddoodle.com'
  );
  const [segmentId, setSegmentId] = useState<string>(initialCampaign?.segment_id || '');
  const [status, setStatus] = useState<string>(initialCampaign?.status || 'draft');

  // Blocks source of truth
  const initialContent = initialCampaign?.content as { blocks?: V1CampaignBlock[] } | null;
  const initialBlocks =
    Array.isArray(initialContent?.blocks) && initialContent.blocks.length > 0
      ? initialContent.blocks
      : !initialCampaign
      ? V1_EMAIL_TEMPLATES[0].blocks
      : [];

  const [blocks, setBlocks] = useState<V1CampaignBlock[]>(initialBlocks);

  // Editor State
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Modals
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isTestSendOpen, setIsTestSendOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Audience & Segments Lookup
  const [segments, setSegments] = useState<MarketingSegment[]>([]);
  const [loadingSegments, setLoadingSegments] = useState(false);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [loadingAudience, setLoadingAudience] = useState(false);

  // Ref to prevent duplicate concurrent saves
  const isSavingRef = useRef(false);

  // 1. Load active segments
  useEffect(() => {
    async function loadSegments() {
      try {
        setLoadingSegments(true);
        const res = await fetch('/api/admin/marketing/segments?active=true');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setSegments(json.data);
        }
      } catch (err) {
        console.error('Failed to load marketing segments', err);
      } finally {
        setLoadingSegments(false);
      }
    }
    loadSegments();
  }, []);

  // 2. Fetch audience count on segment change
  useEffect(() => {
    if (!segmentId) {
      setAudienceCount(null);
      return;
    }

    async function loadCount() {
      try {
        setLoadingAudience(true);
        const res = await fetch(`/api/admin/marketing/segments/${segmentId}/count`);
        const json = await res.json();
        if (json.success && typeof json.count === 'number') {
          setAudienceCount(json.count);
        } else {
          setAudienceCount(null);
        }
      } catch (err) {
        console.error('Failed to load segment count', err);
        setAudienceCount(null);
      } finally {
        setLoadingAudience(false);
      }
    }
    loadCount();
  }, [segmentId]);

  // Mark changes
  const markDirty = () => setHasUnsavedChanges(true);

  // 3. Save Campaign to Server
  const saveCampaign = useCallback(
    async (overrideStatus?: string): Promise<string | null> => {
      if (isSavingRef.current) return campaignId;

      try {
        isSavingRef.current = true;
        setIsSaving(true);

        const payload = {
          name: name.trim() || 'Untitled Campaign',
          subject: subject.trim() || null,
          preview_text: previewText.trim() || null,
          sender_name: senderName.trim() || null,
          sender_email: senderEmail.trim() || null,
          segment_id: segmentId || null,
          status: overrideStatus || status,
          content: {
            blocks,
            html: compileCampaignBlocksToHtml(blocks),
          },
        };

        if (campaignId) {
          // Update existing
          const res = await fetch(`/api/admin/marketing/campaigns/${campaignId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const json = await res.json();

          if (!res.ok || !json.success) {
            throw new Error(json.error || 'Failed to update campaign');
          }

          setHasUnsavedChanges(false);
          return campaignId;
        } else {
          // Create new
          const res = await fetch('/api/admin/marketing/campaigns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, type: 'email' }),
          });
          const json = await res.json();

          if (!res.ok || !json.success) {
            throw new Error(json.error || 'Failed to create campaign');
          }

          const newId = json.data.id;
          setCampaignId(newId);
          setHasUnsavedChanges(false);
          window.history.replaceState(null, '', `/admin/marketing/campaigns/${newId}`);
          return newId;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to save campaign';
        toast.error(msg);
        return null;
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);
      }
    },
    [campaignId, name, subject, previewText, senderName, senderEmail, segmentId, status, blocks]
  );

  // 4. Autosave Debounce (every 4 seconds after changes)
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const timer = setTimeout(() => {
      saveCampaign();
    }, 4000);

    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, saveCampaign]);

  // 5. Metadata Update Handlers
  const handleUpdateMetadata = (field: string, value: any) => {
    if (field === 'name') setName(value);
    if (field === 'subject') setSubject(value);
    if (field === 'previewText') setPreviewText(value);
    if (field === 'senderName') setSenderName(value);
    if (field === 'senderEmail') setSenderEmail(value);
    if (field === 'segmentId') setSegmentId(value);
    markDirty();
  };

  // 6. Block Operations
  const handleAddBlock = (type: V1CampaignBlockType) => {
    const newBlock = createDefaultBlock(type);
    const next = [...blocks, newBlock];
    setBlocks(next);
    setSelectedBlockId(newBlock.id);
    markDirty();
    toast.success(`Added ${type} block`);
  };

  const handleInsertBlock = (type: V1CampaignBlockType, index: number) => {
    const newBlock = createDefaultBlock(type);
    const next = [...blocks];
    next.splice(index, 0, newBlock);
    setBlocks(next);
    setSelectedBlockId(newBlock.id);
    markDirty();
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;

    const next = [...blocks];
    const [moved] = next.splice(index, 1);
    next.splice(targetIdx, 0, moved);
    setBlocks(next);
    markDirty();
  };

  const handleDuplicateBlock = (index: number) => {
    const src = blocks[index];
    if (!src) return;

    const clone: V1CampaignBlock = {
      ...src,
      id: generateBlockId(src.type),
      data: JSON.parse(JSON.stringify(src.data)),
    } as V1CampaignBlock;

    const next = [...blocks];
    next.splice(index + 1, 0, clone);
    setBlocks(next);
    setSelectedBlockId(clone.id);
    markDirty();
    toast.success('Block duplicated');
  };

  const handleDeleteBlock = (indexOrId: number | string) => {
    let next: V1CampaignBlock[];
    if (typeof indexOrId === 'number') {
      next = blocks.filter((_, idx) => idx !== indexOrId);
    } else {
      next = blocks.filter((b) => b.id !== indexOrId);
    }
    setBlocks(next);
    if (selectedBlockId === (typeof indexOrId === 'string' ? indexOrId : blocks[indexOrId]?.id)) {
      setSelectedBlockId(null);
    }
    markDirty();
    toast.info('Block deleted');
  };

  const handleUpdateBlock = (id: string, updates: Partial<V1CampaignBlock['data']>) => {
    const next = blocks.map((b) => {
      if (b.id === id) {
        return {
          ...b,
          data: {
            ...b.data,
            ...updates,
          },
        } as V1CampaignBlock;
      }
      return b;
    });
    setBlocks(next);
    markDirty();
  };

  // 7. Apply Template Preset
  const handleApplyTemplate = (preset: V1EmailTemplatePreset) => {
    if (
      blocks.length > 0 &&
      !window.confirm(
        `Load "${preset.name}" template? This will replace your current email blocks and subject.`
      )
    ) {
      return;
    }

    setBlocks(preset.blocks);
    if (preset.defaultSubject) setSubject(preset.defaultSubject);
    if (preset.defaultPreviewText) setPreviewText(preset.defaultPreviewText);
    setSelectedBlockId(null);
    markDirty();
    toast.success(`Loaded "${preset.name}" template`);
  };

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-surface">
      {/* Top Header */}
      <BuilderHeader
        name={name}
        status={status}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        viewport={viewport}
        onViewportChange={setViewport}
        onSave={() => {
          saveCampaign();
          toast.success('Campaign saved');
        }}
        onOpenPreview={() => setIsPreviewOpen(true)}
        onOpenTestSend={() => setIsTestSendOpen(true)}
        onOpenReview={() => setIsReviewOpen(true)}
      />

      {/* Main 3-Column Studio Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Panel: Content Blocks & Templates */}
        <ComponentPalette
          onAddBlock={handleAddBlock}
          onApplyTemplate={handleApplyTemplate}
        />

        {/* Center Panel: Interactive Canvas */}
        <EmailCanvas
          blocks={blocks}
          selectedBlockId={selectedBlockId}
          viewport={viewport}
          senderName={senderName}
          senderEmail={senderEmail}
          subject={subject}
          previewText={previewText}
          onSelectBlock={setSelectedBlockId}
          onInsertBlock={handleInsertBlock}
          onMoveBlock={handleMoveBlock}
          onDuplicateBlock={handleDuplicateBlock}
          onDeleteBlock={handleDeleteBlock}
        />

        {/* Right Panel: Contextual Settings (Global or Block-specific) */}
        <ContextualSettings
          selectedBlock={selectedBlock}
          name={name}
          subject={subject}
          previewText={previewText}
          senderName={senderName}
          senderEmail={senderEmail}
          segmentId={segmentId}
          segments={segments}
          loadingSegments={loadingSegments}
          audienceCount={audienceCount}
          loadingAudience={loadingAudience}
          onUpdateMetadata={handleUpdateMetadata}
          onUpdateBlock={handleUpdateBlock}
          onDeselectBlock={() => setSelectedBlockId(null)}
          onDeleteBlock={(id) => handleDeleteBlock(id)}
        />
      </div>

      {/* Modals */}
      {/* 1. Email Preview Drawer with persona switcher */}
      <EmailPreviewDrawer
        isOpen={isPreviewOpen}
        blocks={blocks}
        subject={subject}
        previewText={previewText}
        senderName={senderName}
        senderEmail={senderEmail}
        onClose={() => setIsPreviewOpen(false)}
      />

      {/* 2. Test Send Modal */}
      {isTestSendOpen && (
        <TestSendModal
          isOpen={isTestSendOpen}
          campaignId={campaignId}
          onClose={() => setIsTestSendOpen(false)}
        />
      )}

      {/* 3. Campaign Review & Send Modal */}
      <CampaignReviewModal
        isOpen={isReviewOpen}
        campaignId={campaignId}
        name={name}
        subject={subject}
        previewText={previewText}
        senderName={senderName}
        senderEmail={senderEmail}
        segmentId={segmentId}
        segments={segments}
        audienceCount={audienceCount}
        blocks={blocks}
        onClose={() => setIsReviewOpen(false)}
        onSaveBeforeAction={async () => {
          return await saveCampaign();
        }}
        onSuccess={() => {
          setIsReviewOpen(false);
          router.push('/admin/marketing/campaigns');
        }}
      />
    </div>
  );
}
