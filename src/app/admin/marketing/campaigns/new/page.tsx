'use client';

import React from 'react';
import { CampaignComposer } from '@/components/admin/marketing/CampaignComposer';

export default function NewCampaignPage() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <CampaignComposer initialCampaign={null} />
    </div>
  );
}
