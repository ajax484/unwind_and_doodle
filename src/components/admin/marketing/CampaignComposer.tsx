'use client';

import React from 'react';
import { MarketingCampaign } from '@/types/marketing';
import { EmailBuilder } from './builder/EmailBuilder';

export interface CampaignComposerProps {
  initialCampaign?: MarketingCampaign | null;
}

export function CampaignComposer({ initialCampaign }: CampaignComposerProps) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <EmailBuilder initialCampaign={initialCampaign} />
    </div>
  );
}
