'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  V1CampaignBlock,
  V1CampaignBlockType,
  V1TextBlock,
  V1ImageBlock,
  V1ButtonBlock,
  V1CalloutBlock,
  V1DividerBlock,
} from '@/types/marketing-builder';
import { ServiceEmailTemplateDetail } from '@/types/service-email';
import { EmailCanvas } from '@/components/admin/marketing/builder/canvas/EmailCanvas';
import { ServiceEmailHeader } from './ServiceEmailHeader';
import { ServiceEmailPalette } from './ServiceEmailPalette';
import { ServiceEmailSettingsPanel } from './ServiceEmailSettingsPanel';
import { ServiceEmailPreviewModal } from './ServiceEmailPreviewModal';
import { getDefaultBlocksForTemplate, compileServiceEmailBlocks } from '@/lib/service-email-blocks';
import { interpolateTemplate } from '@/services/service-email.service';
import Modal from '@/components/Modal';
import TextInput from '@/components/TextInput';
import Button from '@/components/Button';
import Spinner from '@/components/Spinner';

export interface ServiceEmailVisualEditorProps {
  initialDetail: ServiceEmailTemplateDetail;
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
          content: 'Write your message here...',
          style: 'body',
          align: 'left',
        },
      } as V1TextBlock;

    case 'button':
      return {
        id,
        type: 'button',
        data: {
          text: 'Take Action',
          url: 'https://unwindanddoodle.com',
          style: 'rose',
          align: 'center',
        },
      } as V1ButtonBlock;

    case 'callout':
      return {
        id,
        type: 'callout',
        data: {
          title: 'Important Notice',
          message: 'Notification details go here.',
          variant: 'rose',
        },
      } as V1CalloutBlock;

    case 'divider':
      return {
        id,
        type: 'divider',
        data: { spacing: 'md' },
      } as V1DividerBlock;

    case 'image':
      return {
        id,
        type: 'image',
        data: {
          url: '',
          alt: 'Email Asset',
          caption: '',
          linkUrl: '',
          align: 'center',
          width: 'full',
        },
      } as V1ImageBlock;

    default:
      return {
        id,
        type: 'text',
        data: {
          content: 'Text block',
          style: 'body',
          align: 'left',
        },
      } as V1TextBlock;
  }
}

export function ServiceEmailVisualEditor({ initialDetail }: ServiceEmailVisualEditorProps) {
  const router = useRouter();

  // Template state
  const [detail, setDetail] = useState<ServiceEmailTemplateDetail>(initialDetail);
  const [subject, setSubject] = useState<string>(initialDetail.effectiveSubject);
  const [isActive, setIsActive] = useState<boolean>(initialDetail.isActive);
  const [blocks, setBlocks] = useState<V1CampaignBlock[]>(() => {
    return initialDetail.blocks && initialDetail.blocks.length > 0
      ? initialDetail.blocks
      : getDefaultBlocksForTemplate(initialDetail.key);
  });

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Modals state
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [testRecipient, setTestRecipient] = useState<string>('');
  const [sendingTest, setSendingTest] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);

  // Unsaved changes beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Selected block lookup
  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;

  // Block management
  const handleAddBlock = (type: V1CampaignBlockType) => {
    const newBlock = createDefaultBlock(type);
    setBlocks((prev) => [...prev, newBlock]);
    setSelectedBlockId(newBlock.id);
    setHasUnsavedChanges(true);
  };

  const handleAddItemsTableBlock = () => {
    const newBlock: V1TextBlock = {
      id: generateBlockId('items'),
      type: 'text',
      data: {
        content: '{{itemsTable}}',
        style: 'body',
        align: 'left',
      },
    };
    setBlocks((prev) => [...prev, newBlock]);
    setSelectedBlockId(newBlock.id);
    setHasUnsavedChanges(true);
  };

  const handleInsertBlock = (type: V1CampaignBlockType, index: number) => {
    const newBlock = createDefaultBlock(type);
    setBlocks((prev) => {
      const next = [...prev];
      next.splice(index, 0, newBlock);
      return next;
    });
    setSelectedBlockId(newBlock.id);
    setHasUnsavedChanges(true);
  };

  const handleUpdateBlock = (id: string, updates: Partial<V1CampaignBlock['data']>) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        return {
          ...b,
          data: {
            ...b.data,
            ...updates,
          },
        } as V1CampaignBlock;
      })
    );
    setHasUnsavedChanges(true);
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    setBlocks((prev) => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const handleDuplicateBlock = (index: number) => {
    setBlocks((prev) => {
      const next = [...prev];
      const source = next[index];
      if (!source) return prev;
      const cloned: V1CampaignBlock = {
        ...JSON.parse(JSON.stringify(source)),
        id: generateBlockId(source.type),
      };
      next.splice(index + 1, 0, cloned);
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const handleDeleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
    setHasUnsavedChanges(true);
  };

  const handleDeleteBlockByIndex = (index: number) => {
    const target = blocks[index];
    if (target) {
      handleDeleteBlock(target.id);
    }
  };

  const handleRestoreDefaults = () => {
    const canonicalBlocks = getDefaultBlocksForTemplate(detail.key);
    setBlocks(canonicalBlocks);
    setSelectedBlockId(null);
    setHasUnsavedChanges(true);
    toast.success('Layout reset to default template blocks');
  };

  // Save changes
  const handleSave = async () => {
    if (!subject.trim()) {
      toast.error('Subject line is required');
      return;
    }

    try {
      setIsSaving(true);
      const compiledHtml = compileServiceEmailBlocks(blocks);

      const res = await fetch(`/api/admin/settings/service-emails/${detail.key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          bodyHtml: compiledHtml,
          blocks,
          isActive,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save template');
      }

      setDetail(json.data);
      setHasUnsavedChanges(false);
      toast.success('Template saved successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error saving template');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default template (DELETE override)
  const handleResetToDefault = async () => {
    try {
      setResetting(true);
      const res = await fetch(`/api/admin/settings/service-emails/${detail.key}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to reset template');
      }

      const updatedData: ServiceEmailTemplateDetail = json.data;
      setDetail(updatedData);
      setSubject(updatedData.effectiveSubject);
      setIsActive(updatedData.isActive);
      setBlocks(getDefaultBlocksForTemplate(detail.key));
      setSelectedBlockId(null);
      setHasUnsavedChanges(false);
      setIsResetModalOpen(false);
      toast.success('Template reset to system default');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error resetting template');
    } finally {
      setResetting(false);
    }
  };

  // Send test email
  const handleSendTest = async () => {
    if (!testRecipient || !testRecipient.includes('@')) {
      toast.error('Valid email address is required');
      return;
    }

    try {
      setSendingTest(true);
      const compiledHtml = compileServiceEmailBlocks(blocks);

      const res = await fetch(`/api/admin/settings/service-emails/${detail.key}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: testRecipient.trim(),
          subjectOverride: subject.trim(),
          bodyHtmlOverride: compiledHtml,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to send test email');
      }

      toast.success(`Test email sent to ${testRecipient}`);
      setIsTestModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error sending test email');
    } finally {
      setSendingTest(false);
    }
  };

  // Render preview with sample data
  const previewHtml = React.useMemo(() => {
    const rawHtml = compileServiceEmailBlocks(blocks);
    return interpolateTemplate(rawHtml, detail.sampleData, { isHtml: true });
  }, [blocks, detail.sampleData]);

  const previewSubject = React.useMemo(() => {
    return interpolateTemplate(subject, detail.sampleData, { isHtml: false });
  }, [subject, detail.sampleData]);

  const isOrderRelated = detail.category === 'order' || detail.key === 'admin_new_order';

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-bg-surface overflow-hidden">
      {/* Top Header */}
      <ServiceEmailHeader
        name={detail.name}
        category={detail.category}
        isCustomized={detail.isCustomized}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        viewport={viewport}
        onViewportChange={setViewport}
        onSave={handleSave}
        onOpenPreview={() => setIsPreviewOpen(true)}
        onOpenTestSend={() => setIsTestModalOpen(true)}
        onOpenResetModal={() => setIsResetModalOpen(true)}
      />

      {/* Main 3-Column Visual Workspace */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left Palette */}
        <ServiceEmailPalette
          onAddBlock={handleAddBlock}
          onRestoreDefaults={handleRestoreDefaults}
          showItemsTableBlock={isOrderRelated}
          onAddItemsTableBlock={handleAddItemsTableBlock}
        />

        {/* Center Visual Canvas */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-bg-subtle/40">
          <EmailCanvas
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            viewport={viewport}
            senderName="Unwind & Doodle"
            senderEmail="no-reply@unwindanddoodle.com"
            subject={subject || '(No subject)'}
            onSelectBlock={setSelectedBlockId}
            onInsertBlock={handleInsertBlock}
            onMoveBlock={handleMoveBlock}
            onDuplicateBlock={handleDuplicateBlock}
            onDeleteBlock={handleDeleteBlockByIndex}
          />
        </div>

        {/* Right Settings / Inspector */}
        <ServiceEmailSettingsPanel
          selectedBlock={selectedBlock}
          subject={subject}
          isActive={isActive}
          variables={detail.variables}
          templateName={detail.name}
          templateCategory={detail.category}
          templateDescription={detail.description}
          onUpdateSubject={(val) => {
            setSubject(val);
            setHasUnsavedChanges(true);
          }}
          onUpdateIsActive={(val) => {
            setIsActive(val);
            setHasUnsavedChanges(true);
          }}
          onUpdateBlock={handleUpdateBlock}
          onDeselectBlock={() => setSelectedBlockId(null)}
          onDeleteBlock={handleDeleteBlock}
        />
      </div>

      {/* Live Preview Modal */}
      <ServiceEmailPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        subject={previewSubject}
        htmlContent={previewHtml}
        onOpenTestSend={() => setIsTestModalOpen(true)}
      />

      {/* Test Send Modal */}
      <Modal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        title="Send Test Email"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-primary">
              Recipient Email Address
            </label>
            <TextInput
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="admin@unwindanddoodle.com"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTestModalOpen(false)}
              disabled={sendingTest}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSendTest}
              disabled={sendingTest || !testRecipient}
            >
              {sendingTest ? <Spinner size="sm" /> : 'Send Test'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Reset to System Default"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Resetting will discard your customized template override for &ldquo;{detail.name}&rdquo; and restore the canonical system default.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsResetModalOpen(false)}
              disabled={resetting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleResetToDefault}
              disabled={resetting}
              className="bg-status-danger-accent hover:bg-status-danger-accent/90 text-white"
            >
              {resetting ? <Spinner size="sm" /> : 'Confirm Reset'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
