import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within, userEvent, fn } from 'storybook/test';
import React, { useState } from 'react';
import AddressCard, { AddressData } from './AddressCard';
import Button from './Button';

const sampleAddress: AddressData = {
  id: 'addr-1',
  label: 'Home',
  recipientName: 'Bilal Yusuf',
  streetAddress: '12 Example Street',
  addressLine2: 'Apt 4B, Sunflower Estate',
  city: 'Ikeja',
  state: 'Lagos',
  postalCode: '100001',
  country: 'Nigeria',
  phone: '+234 800 000 0000',
  isDefault: true,
};

const meta = {
  title: 'Design System/Molecules/AddressCard',
  component: AddressCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Canonical delivery address card molecule adhering directly to Figma Component Set `43:48157` (8 variants) and Documentation Board `43:49054` ("Address Cards" on `Components` page). Features accessible radio-style selection, default address badge tagging, multi-line address formatting, and isolated action button controls.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'radio',
      options: ['md', 'sm'],
      description: 'Sizing scale variant (MD 16px padding vs SM 12px padding).',
    },
    selected: {
      control: 'boolean',
      description: 'Card selection state with 2px brand border and Rose inner radio dot.',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables card interaction and dims contrast.',
    },
    selectable: {
      control: 'boolean',
      description: 'Controls display of 20px circular radio selection indicator.',
    },
    isDefault: {
      control: 'boolean',
      description: 'Displays lightweight Default tag badge.',
    },
    label: {
      control: 'text',
      description: 'Address category label (Home, Office, Art Studio).',
    },
    recipientName: {
      control: 'text',
      description: 'Recipient name heading.',
    },
    streetAddress: {
      control: 'text',
      description: 'Street address line 1.',
    },
    phone: {
      control: 'text',
      description: 'Contact phone number.',
    },
    showActions: {
      control: 'boolean',
      description: 'Whether to show Edit and Remove action buttons.',
    },
  },
  args: {
    address: sampleAddress,
    size: 'md',
    selected: false,
    disabled: false,
    selectable: true,
    onSelect: fn(),
    onEdit: fn(),
    onRemove: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[420px] max-w-full p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AddressCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 1. Default Unselected Address Card
 */
export const Default: Story = {
  args: {
    address: sampleAddress,
    selected: false,
  },
};

/**
 * 2. Selected State (Active Radio with Rose Dot & Brand Border)
 */
export const Selected: Story = {
  args: {
    address: sampleAddress,
    selected: true,
  },
};

/**
 * 3. Small Size (SM: 12px Padding & Compact Typography)
 */
export const SmallSize: Story = {
  args: {
    address: sampleAddress,
    size: 'sm',
  },
};

/**
 * 4. Secondary Address Without Default Badge
 */
export const WithoutDefaultBadge: Story = {
  args: {
    address: {
      ...sampleAddress,
      id: 'addr-2',
      label: 'Office',
      streetAddress: '45 Commercial Avenue, Floor 4',
      addressLine2: 'Tech Hub Towers',
      city: 'Victoria Island',
      state: 'Lagos',
      isDefault: false,
    },
    selected: false,
  },
};

/**
 * 5. Clean Card Without Phone Number
 */
export const WithoutPhone: Story = {
  args: {
    address: {
      ...sampleAddress,
      id: 'addr-3',
      label: 'Art Studio',
      recipientName: 'Amina Adeleke',
      streetAddress: '8 Craft & Canvas Lane',
      addressLine2: null,
      city: 'Lekki Phase 1',
      state: 'Lagos',
      phone: null,
      isDefault: false,
    },
  },
};

/**
 * 6. Read-Only Display (Actions & Radio Hidden)
 */
export const ReadOnlyDisplay: Story = {
  args: {
    address: sampleAddress,
    selectable: false,
    showActions: false,
  },
};

/**
 * 7. Disabled State
 */
export const DisabledState: Story = {
  args: {
    address: sampleAddress,
    disabled: true,
  },
};

/**
 * 8. Checkout Delivery Address Radio Group Scenario
 */
export const CheckoutRadioGroup: Story = {
  render: () => {
    const addresses: AddressData[] = [
      sampleAddress,
      {
        id: 'addr-2',
        label: 'Office',
        recipientName: 'Bilal Yusuf',
        streetAddress: '45 Commercial Avenue, Floor 4',
        addressLine2: 'Tech Hub Towers',
        city: 'Victoria Island',
        state: 'Lagos',
        phone: '+234 800 000 0000',
        isDefault: false,
      },
      {
        id: 'addr-3',
        label: 'Art Studio',
        recipientName: 'Amina Adeleke',
        streetAddress: '8 Craft & Canvas Lane',
        city: 'Lekki Phase 1',
        state: 'Lagos',
        phone: '+234 802 123 4567',
        isDefault: false,
      },
    ];

    const AddressGroup = () => {
      const [selectedId, setSelectedId] = useState<string>('addr-1');

      return (
        <div className="flex flex-col gap-3 w-full" role="radiogroup" aria-label="Delivery address">
          <div className="flex flex-col gap-1 mb-1">
            <h3 className="font-heading font-semibold text-text-primary text-base">
              Delivery address
            </h3>
            <p className="font-body text-xs text-text-tertiary">
              Select a saved delivery address or enter a new recipient destination.
            </p>
          </div>

          {addresses.map((addr) => (
            <AddressCard
              key={addr.id}
              address={addr}
              selected={selectedId === addr.id}
              onSelect={() => setSelectedId(addr.id || '')}
              onEdit={() => alert(`Edit ${addr.label}`)}
              onRemove={() => alert(`Remove ${addr.label}`)}
            />
          ))}

          <Button variant="outline" size="md" className="mt-2 w-full">
            + Add a new address
          </Button>
        </div>
      );
    };

    return <AddressGroup />;
  },
};

/**
 * 9. Interactive Play Test (Selection, Keyboard, Action Event Isolation)
 */
export const InteractivePlay: Story = {
  args: {
    address: sampleAddress,
    'data-testid': 'interactive-address-card',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    const card = canvas.getByTestId('interactive-address-card');
    await expect(card).toBeInTheDocument();

    // Verify recipient name and label
    await expect(canvas.getByText('Bilal Yusuf')).toBeInTheDocument();
    await expect(canvas.getByText('Home')).toBeInTheDocument();
    await expect(canvas.getByText('Default')).toBeInTheDocument();

    // Verify card click triggers onSelect
    await userEvent.click(card);
    await expect(args.onSelect).toHaveBeenCalled();

    // Verify Edit button click triggers onEdit and DOES NOT trigger additional onSelect
    const editBtn = canvas.getByTestId('interactive-address-card-edit-btn');
    await expect(editBtn).toBeInTheDocument();
    const selectCallsBefore = (args.onSelect as any).mock.calls.length;

    await userEvent.click(editBtn);
    await expect(args.onEdit).toHaveBeenCalled();
    // Verify event isolation: onSelect count should remain identical
    await expect((args.onSelect as any).mock.calls.length).toBe(selectCallsBefore);

    // Verify Remove button click triggers onRemove
    const removeBtn = canvas.getByTestId('interactive-address-card-remove-btn');
    await expect(removeBtn).toBeInTheDocument();
    await userEvent.click(removeBtn);
    await expect(args.onRemove).toHaveBeenCalled();
    await expect((args.onSelect as any).mock.calls.length).toBe(selectCallsBefore);

    // Verify keyboard Space activation
    await card.focus();
    await userEvent.keyboard(' ');
    await expect((args.onSelect as any).mock.calls.length).toBe(selectCallsBefore + 1);
  },
};

/**
 * 10. CSS Token Verification
 */
export const CssCheck: Story = {
  args: {
    address: sampleAddress,
    'data-testid': 'css-check-address-card',
    selected: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByTestId('css-check-address-card');
    await expect(card).toBeInTheDocument();

    const computed = window.getComputedStyle(card);
    // Radius/LG 16px-20px (rounded-2xl)
    await expect(computed.borderRadius).toMatch(/16px|20px/);

    // Selected state 2px brand border (#A7C2D4 -> rgb(167, 194, 212))
    await expect(computed.borderColor).toMatch(/rgb\(167,\s*194,\s*212\)/);
  },
};
