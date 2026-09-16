'use client';

import React from 'react';
import Link from 'next/link';
import { AutomationForm } from '@/components/admin/marketing/AutomationForm';

export default function NewAutomationPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-text-tertiary mb-1">
          <Link href="/admin" className="hover:text-text-secondary transition-colors">
            Admin
          </Link>
          <span>/</span>
          <span className="text-text-secondary">Marketing</span>
          <span>/</span>
          <Link
            href="/admin/marketing/automations"
            className="hover:text-text-secondary transition-colors"
          >
            Automations
          </Link>
          <span>/</span>
          <span className="text-text-primary font-medium">New Automation</span>
        </nav>
        <h1 className="text-xl sm:text-2xl font-bold font-heading text-text-primary tracking-tight">
          Create Automation
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
          Configure an automated trigger, optional delay, and email action.
        </p>
      </div>

      <AutomationForm initialAutomation={null} />
    </div>
  );
}
