'use client';

import React from 'react';
import {
  V1CampaignBlock,
  V1TextBlock,
  V1ButtonBlock,
  V1CalloutBlock,
  V1DividerBlock,
  V1ImageBlock,
} from '@/types/marketing-builder';
import { ServiceEmailVariable } from '@/types/service-email';
import TextInput from '@/components/TextInput';
import Select from '@/components/Select';
import Button from '@/components/Button';
import { VariablePicker } from './VariablePicker';

export interface ServiceEmailSettingsPanelProps {
  selectedBlock: V1CampaignBlock | null;
  subject: string;
  isActive: boolean;
  variables: ServiceEmailVariable[];
  templateName: string;
  templateCategory: string;
  templateDescription: string;
  onUpdateSubject: (subject: string) => void;
  onUpdateIsActive: (active: boolean) => void;
  onUpdateBlock: (id: string, updates: Partial<V1CampaignBlock['data']>) => void;
  onDeselectBlock: () => void;
  onDeleteBlock: (id: string) => void;
}

export function ServiceEmailSettingsPanel({
  selectedBlock,
  subject,
  isActive,
  variables,
  templateName,
  templateCategory,
  templateDescription,
  onUpdateSubject,
  onUpdateIsActive,
  onUpdateBlock,
  onDeselectBlock,
  onDeleteBlock,
}: ServiceEmailSettingsPanelProps) {
  // --------------------------------------------------------------------------
  // 1. GLOBAL TEMPLATE SETTINGS (When no block selected)
  // --------------------------------------------------------------------------
  if (!selectedBlock) {
    return (
      <aside className="w-80 border-l border-border-default bg-bg-surface flex flex-col h-full shrink-0 overflow-hidden">
        <div className="p-3.5 border-b border-border-default shrink-0">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
            Email Settings
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Subject Line */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-primary">
              Subject Line
            </label>
            <TextInput
              value={subject}
              onChange={(e) => onUpdateSubject(e.target.value)}
              placeholder="Email subject..."
            />
            <VariablePicker
              variables={variables}
              onSelectVariable={(token) => onUpdateSubject(`${subject} ${token}`.trim())}
              label="Subject Variables"
            />
          </div>

          {/* Active Status */}
          <div className="space-y-2 pt-2 border-t border-border-default">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-primary">
                Template Status
              </label>
              <button
                type="button"
                onClick={() => onUpdateIsActive(!isActive)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  isActive ? 'bg-status-success-accent' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    isActive ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <span className="text-[11px] text-text-tertiary block">
              {isActive ? 'Active: Dispatched automatically when triggered' : 'Inactive: Notification delivery paused'}
            </span>
          </div>

          {/* Template Details */}
          <div className="space-y-2 pt-2 border-t border-border-default text-xs">
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block">
              Template Info
            </span>
            <div className="bg-bg-subtle p-3 rounded-xl border border-border-default space-y-1.5">
              <div className="font-semibold text-text-primary">{templateName}</div>
              <div className="text-[11px] text-text-secondary">{templateDescription}</div>
              <div className="text-[10px] text-text-tertiary uppercase tracking-wider font-bold pt-1">
                Category: {templateCategory}
              </div>
            </div>
          </div>

          {/* Available Merge Variables Reference */}
          <div className="space-y-2 pt-2 border-t border-border-default text-xs">
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block">
              Available Dynamic Variables
            </span>
            <div className="space-y-2">
              {variables.map((v) => (
                <div
                  key={v.key}
                  className="p-2 rounded-lg bg-bg-subtle/70 border border-border-default/60 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-brand-rose text-[11px]">
                      {`{{${v.key}}}`}
                    </span>
                    <span className="text-[10px] text-text-tertiary uppercase font-semibold">
                      {v.type}
                    </span>
                  </div>
                  <div className="text-[11px] text-text-secondary">{v.description}</div>
                  <div className="text-[10px] text-text-tertiary">Example: {v.example}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // --------------------------------------------------------------------------
  // 2. BLOCK-SPECIFIC SETTINGS (When a block is selected)
  // --------------------------------------------------------------------------
  const blockType = selectedBlock.type;
  const blockData = selectedBlock.data as any;

  return (
    <aside className="w-80 border-l border-border-default bg-bg-surface flex flex-col h-full shrink-0 overflow-hidden">
      <div className="p-3.5 border-b border-border-default flex items-center justify-between shrink-0">
        <div>
          <span className="text-[10px] uppercase font-bold text-brand-rose tracking-wider">
            Block Settings
          </span>
          <h3 className="text-xs font-bold text-text-primary capitalize">
            {blockType} Block
          </h3>
        </div>
        <button
          type="button"
          onClick={onDeselectBlock}
          className="text-xs text-text-tertiary hover:text-text-primary px-2 py-1 rounded-md hover:bg-bg-subtle"
        >
          ✕ Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TEXT BLOCK */}
        {blockType === 'text' && (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Text Style
              </label>
              <Select
                value={blockData.style || 'body'}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, { style: e.target.value as any })
                }
              >
                <option value="heading">Heading (22px Bold)</option>
                <option value="body">Body (15px Standard)</option>
                <option value="small">Small Note (13px Slate)</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Alignment
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => onUpdateBlock(selectedBlock.id, { align })}
                    className={`py-1.5 text-xs font-medium rounded-lg border capitalize ${
                      (blockData.align || 'left') === align
                        ? 'bg-brand-rose text-white border-brand-rose'
                        : 'border-border-default bg-white text-text-secondary hover:bg-bg-subtle'
                    }`}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Content
              </label>
              <textarea
                rows={6}
                value={blockData.content || ''}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, { content: e.target.value })
                }
                placeholder="Write your email text here..."
                className="w-full text-xs p-2.5 rounded-xl border border-border-default focus:border-brand-rose focus:ring-1 focus:ring-brand-rose outline-none font-sans leading-relaxed resize-y"
              />
            </div>

            <VariablePicker
              variables={variables}
              onSelectVariable={(token) => {
                const current = blockData.content || '';
                onUpdateBlock(selectedBlock.id, {
                  content: `${current} ${token}`.trim(),
                });
              }}
            />
          </>
        )}

        {/* BUTTON BLOCK */}
        {blockType === 'button' && (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Button Text
              </label>
              <TextInput
                value={blockData.text || ''}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, { text: e.target.value })
                }
                placeholder="Button label..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Destination URL
              </label>
              <TextInput
                value={blockData.url || ''}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, { url: e.target.value })
                }
                placeholder="https://... or {{trackingUrl}}"
              />
            </div>

            <VariablePicker
              variables={variables.filter((v) => v.key.toLowerCase().endsWith('url') || v.type === 'string')}
              onSelectVariable={(token) => {
                onUpdateBlock(selectedBlock.id, { url: token });
              }}
              label="Insert URL Variable"
            />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Button Style
              </label>
              <Select
                value={blockData.style || 'rose'}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, { style: e.target.value as any })
                }
              >
                <option value="rose">Brand Rose</option>
                <option value="primary">Primary Dark</option>
                <option value="secondary">Secondary Slate</option>
                <option value="blue">Accent Blue</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Alignment
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => onUpdateBlock(selectedBlock.id, { align })}
                    className={`py-1.5 text-xs font-medium rounded-lg border capitalize ${
                      (blockData.align || 'center') === align
                        ? 'bg-brand-rose text-white border-brand-rose'
                        : 'border-border-default bg-white text-text-secondary hover:bg-bg-subtle'
                    }`}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* CALLOUT BLOCK */}
        {blockType === 'callout' && (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Title
              </label>
              <TextInput
                value={blockData.title || ''}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, { title: e.target.value })
                }
                placeholder="Optional callout title..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Message
              </label>
              <textarea
                rows={4}
                value={blockData.message || ''}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, { message: e.target.value })
                }
                placeholder="Callout notice message..."
                className="w-full text-xs p-2.5 rounded-xl border border-border-default focus:border-brand-rose focus:ring-1 focus:ring-brand-rose outline-none font-sans leading-relaxed resize-y"
              />
            </div>

            <VariablePicker
              variables={variables}
              onSelectVariable={(token) => {
                const current = blockData.message || '';
                onUpdateBlock(selectedBlock.id, {
                  message: `${current} ${token}`.trim(),
                });
              }}
            />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Variant Theme
              </label>
              <Select
                value={blockData.variant || 'rose'}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, { variant: e.target.value as any })
                }
              >
                <option value="rose">Soft Rose</option>
                <option value="blue">Serene Blue</option>
                <option value="cream">Warm Cream</option>
              </Select>
            </div>
          </>
        )}

        {/* IMAGE BLOCK */}
        {blockType === 'image' && (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Image URL
              </label>
              <TextInput
                value={blockData.url || ''}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, { url: e.target.value })
                }
                placeholder="https://..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Alt Text
              </label>
              <TextInput
                value={blockData.altText || blockData.alt || ''}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, { altText: e.target.value })
                }
                placeholder="Image description..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Link URL
              </label>
              <TextInput
                value={blockData.linkUrl || ''}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, { linkUrl: e.target.value })
                }
                placeholder="Optional link URL..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">
                Alignment
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => onUpdateBlock(selectedBlock.id, { align })}
                    className={`py-1.5 text-xs font-medium rounded-lg border capitalize ${
                      (blockData.align || 'center') === align
                        ? 'bg-brand-rose text-white border-brand-rose'
                        : 'border-border-default bg-white text-text-secondary hover:bg-bg-subtle'
                    }`}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* DIVIDER BLOCK */}
        {blockType === 'divider' && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-primary">
              Spacing
            </label>
            <Select
              value={blockData.spacing || 'md'}
              onChange={(e) =>
                onUpdateBlock(selectedBlock.id, { spacing: e.target.value as any })
              }
            >
              <option value="sm">Small (16px)</option>
              <option value="md">Medium (24px)</option>
              <option value="lg">Large (36px)</option>
            </Select>
          </div>
        )}

        {/* Delete Block */}
        <div className="pt-4 border-t border-border-default">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDeleteBlock(selectedBlock.id)}
            className="w-full text-xs text-status-danger-accent border-status-danger-accent/30 hover:bg-status-danger-bg"
          >
            🗑️ Delete Block
          </Button>
        </div>
      </div>
    </aside>
  );
}
