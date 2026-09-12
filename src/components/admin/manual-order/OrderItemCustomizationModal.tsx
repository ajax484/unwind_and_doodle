'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import TextInput from '@/components/TextInput';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import Spinner from '@/components/Spinner';
import AlertBanner from '@/components/AlertBanner';

export interface ThemeOption {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  storagePath?: string | null;
  isActive?: boolean;
}

export interface ItemCustomizationData {
  themeIds?: string[];
  coverName?: string;
}

interface OrderItemCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  initialCustomization?: ItemCustomizationData;
  onSave: (customization: ItemCustomizationData | undefined) => void;
}

export function OrderItemCustomizationModal({
  isOpen,
  onClose,
  productId,
  productName,
  initialCustomization,
  onSave,
}: OrderItemCustomizationModalProps) {
  const [themes, setThemes] = useState<ThemeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [coverName, setCoverName] = useState('');
  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync initial state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCoverName(initialCustomization?.coverName || '');
      setSelectedThemeIds(initialCustomization?.themeIds || []);
      setValidationError(null);

      async function fetchThemes() {
        try {
          setLoading(true);
          setFetchError(null);
          const res = await fetch(`/api/admin/products/${productId}/themes`);
          const json = await res.json();
          if (res.ok && json.success && Array.isArray(json.themes)) {
            setThemes(json.themes);
          } else {
            throw new Error(json.error || 'Failed to load themes for product');
          }
        } catch (err: unknown) {
          setFetchError(err instanceof Error ? err.message : 'Error fetching themes');
        } finally {
          setLoading(false);
        }
      }

      fetchThemes();
    }
  }, [isOpen, productId, initialCustomization]);

  if (!isOpen) return null;

  const handleToggleTheme = (themeId: string) => {
    setValidationError(null);
    setSelectedThemeIds((prev) => {
      if (prev.includes(themeId)) {
        return prev.filter((id) => id !== themeId);
      }
      if (prev.length >= 3) {
        setValidationError('You can select a maximum of 3 themes.');
        return prev;
      }
      return [...prev, themeId];
    });
  };

  const handleSave = () => {
    const trimmedCover = coverName.trim();

    if (coverName.length > 0 && trimmedCover.length === 0) {
      setValidationError('Cover name cannot be whitespace only.');
      return;
    }

    if (trimmedCover.length > 100) {
      setValidationError('Cover name must be 100 characters or less.');
      return;
    }

    if (selectedThemeIds.length > 3) {
      setValidationError('At most 3 themes are allowed.');
      return;
    }

    // If both are empty, save undefined to clear customization
    if (selectedThemeIds.length === 0 && !trimmedCover) {
      onSave(undefined);
    } else {
      onSave({
        themeIds: selectedThemeIds.length > 0 ? selectedThemeIds : undefined,
        coverName: trimmedCover || undefined,
      });
    }

    onClose();
  };

  const handleClear = () => {
    setCoverName('');
    setSelectedThemeIds([]);
    setValidationError(null);
    onSave(undefined);
    onClose();
  };

  const isConfigured = Boolean(
    initialCustomization?.coverName ||
    (initialCustomization?.themeIds && initialCustomization.themeIds.length > 0)
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Customize Coloring Book"
      description={`Personalize cover and select themes for "${productName}".`}
      primaryAction={{
        label: 'Apply Customization',
        onClick: handleSave,
      }}
      secondaryAction={{
        label: 'Cancel',
        onClick: onClose,
      }}
    >
      <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-1">
        {/* Validation or Fetch Errors */}
        {fetchError && (
          <AlertBanner
            variant="warning"
            size="sm"
            description={fetchError}
          />
        )}
        {validationError && (
          <AlertBanner
            variant="danger"
            size="sm"
            description={validationError}
          />
        )}

        {/* 1. Cover Personalization */}
        <div className="space-y-2 p-4 rounded-2xl bg-bg-subtle/60 border border-border-default">
          <div className="flex items-center justify-between">
            <label
              htmlFor="cover-name-input"
              className="text-xs sm:text-sm font-heading font-bold text-text-primary"
            >
              Cover Name / Title Personalization
            </label>
            <span className="text-[11px] text-text-tertiary">
              {coverName.length}/100 chars
            </span>
          </div>
          <TextInput
            id="cover-name-input"
            type="text"
            value={coverName}
            maxLength={100}
            onChange={(e) => {
              setValidationError(null);
              setCoverName(e.target.value);
            }}
            placeholder='e.g., Leo’s Coloring Book'
            helperText="Optional. Leave blank to use the standard book cover."
            size="sm"
          />
        </div>

        {/* 2. Theme Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs sm:text-sm font-heading font-bold text-text-primary">
                Select Themes (1 to 3)
              </h4>
              <p className="text-xs text-text-secondary">
                Choose the themes to include in this coloring book edition.
              </p>
            </div>
            <Badge
              variant="status"
              statusType={
                selectedThemeIds.length >= 1 && selectedThemeIds.length <= 3
                  ? 'success'
                  : selectedThemeIds.length > 3
                  ? 'danger'
                  : 'neutral'
              }
              size="sm"
            >
              {selectedThemeIds.length}/3 selected
            </Badge>
          </div>

          {loading ? (
            <div className="p-8 flex flex-col items-center justify-center gap-2 border border-border-default rounded-2xl bg-bg-surface">
              <Spinner size="md" />
              <p className="text-xs text-text-secondary font-medium">
                Loading assigned themes...
              </p>
            </div>
          ) : themes.length === 0 ? (
            <div className="p-5 text-center border border-dashed border-border-default rounded-2xl bg-bg-subtle/40 space-y-1">
              <p className="text-xs sm:text-sm font-semibold text-text-primary">
                No Themes Assigned
              </p>
              <p className="text-xs text-text-secondary max-w-md mx-auto">
                This product supports theme customization, but no active themes have been assigned to it in the catalog yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {themes.map((theme) => {
                const isSelected = selectedThemeIds.includes(theme.id);
                const isMaxReached = selectedThemeIds.length >= 3 && !isSelected;

                return (
                  <button
                    key={theme.id}
                    type="button"
                    disabled={isMaxReached}
                    onClick={() => handleToggleTheme(theme.id)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-action-primary bg-action-primary/5 ring-1 ring-action-primary shadow-xs'
                        : isMaxReached
                        ? 'border-border-default bg-bg-subtle/30 opacity-50 cursor-not-allowed'
                        : 'border-border-default bg-bg-surface hover:bg-bg-subtle/60 hover:border-border-hover'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md border shrink-0 mt-0.5 flex items-center justify-center text-xs font-bold transition-colors ${
                        isSelected
                          ? 'bg-action-primary text-text-inverse border-action-primary'
                          : 'border-border-default bg-bg-surface text-transparent'
                      }`}
                    >
                      ✓
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-heading font-semibold text-text-primary truncate">
                        {theme.name}
                      </p>
                      {theme.description && (
                        <p className="text-[11px] text-text-secondary line-clamp-2 mt-0.5 leading-snug">
                          {theme.description}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Clear customization trigger if already configured */}
        {isConfigured && (
          <div className="pt-2 border-t border-border-default flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-status-danger-accent hover:bg-status-danger-bg hover:text-status-danger-text text-xs"
            >
              Clear Customization
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
