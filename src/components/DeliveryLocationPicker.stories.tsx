import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React, { useState } from 'react';
import DeliveryLocationPicker, { DeliveryLocationItem } from './DeliveryLocationPicker';

const mockLocations: DeliveryLocationItem[] = [
  { id: 'loc-1', name: 'Ikeja', state: 'Lagos', lga: 'Ikeja', deliveryFee: 1500, estimatedDays: '1-2 business days' },
  { id: 'loc-2', name: 'Lekki Phase 1', state: 'Lagos', lga: 'Eti-Osa', deliveryFee: 2000, estimatedDays: '1-2 business days' },
  { id: 'loc-3', name: 'Victoria Island', state: 'Lagos', lga: 'Ibeju-Lekki', deliveryFee: 2000, estimatedDays: '1-2 business days' },
  { id: 'loc-4', name: 'Surulere', state: 'Lagos', lga: 'Surulere', deliveryFee: 1500, estimatedDays: '1-2 business days' },
  { id: 'loc-5', name: 'Garki', state: 'Abuja (FCT)', lga: 'Municipal', deliveryFee: 3500, estimatedDays: '2-4 business days' },
  { id: 'loc-6', name: 'Maitama', state: 'Abuja (FCT)', lga: 'Municipal', deliveryFee: 3500, estimatedDays: '2-4 business days' },
  { id: 'loc-7', name: 'Port Harcourt Hub', state: 'Rivers', lga: 'Port Harcourt', deliveryFee: 4000, estimatedDays: '3-5 business days' },
  { id: 'loc-8', name: 'Ibadan Central', state: 'Oyo', lga: 'Ibadan North', deliveryFee: 2500, estimatedDays: '2-3 business days' },
];

const meta = {
  title: 'Design System/Molecules/DeliveryLocationPicker',
  component: DeliveryLocationPicker,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Canonical 2-Tier Cascading Delivery Location Picker for selecting delivery destinations across Nigeria. Features State selection, cascading Hub/Area selection with dynamic fee and timeframe badges, and a live context summary pill.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    locations: mockLocations,
    selectedLocationId: 'loc-1',
    showSummary: true,
    size: 'md',
    allowBlank: false,
    onChange: () => {},
  },
} satisfies Meta<typeof DeliveryLocationPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function Render(args) {
    const [selectedId, setSelectedId] = useState(args.selectedLocationId);

    return (
      <div className="max-w-xl p-6 bg-bg-surface rounded-2xl border border-border-default space-y-4">
        <h3 className="font-heading font-bold text-base text-text-primary">Delivery Destination</h3>
        <DeliveryLocationPicker
          {...args}
          selectedLocationId={selectedId}
          onChange={(payload) => setSelectedId(payload.locationId)}
        />
      </div>
    );
  },
};

export const AdminModeWithBlank: Story = {
  render: function Render(args) {
    const [selectedId, setSelectedId] = useState('');

    return (
      <div className="max-w-xl p-6 bg-bg-surface rounded-2xl border border-border-default space-y-4">
        <h3 className="font-heading font-bold text-base text-text-primary">Admin Manual Order Entry</h3>
        <p className="text-xs text-text-secondary">
          Allows admin to leave location blank so the customer can enter it via payment link.
        </p>
        <DeliveryLocationPicker
          {...args}
          allowBlank={true}
          selectedLocationId={selectedId}
          onChange={(payload) => setSelectedId(payload.locationId)}
        />
      </div>
    );
  },
};

export const WithValidationErrors: Story = {
  render: function Render(args) {
    return (
      <div className="max-w-xl p-6 bg-bg-surface rounded-2xl border border-border-default space-y-4">
        <h3 className="font-heading font-bold text-base text-text-primary">Form Error State</h3>
        <DeliveryLocationPicker
          {...args}
          selectedLocationId=""
          stateError="Please select a delivery state"
          hubError="Please select a delivery hub"
          onChange={() => {}}
        />
      </div>
    );
  },
};
