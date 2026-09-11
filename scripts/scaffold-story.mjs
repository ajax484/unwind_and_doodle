#!/usr/bin/env node

/**
 * Design System Story Scaffolder
 * Generates a standardized 10-story Storybook suite for a component
 * conforming to Unwind & Doodle design system reconciliation standards.
 * 
 * Usage:
 *   node scripts/scaffold-story.mjs <ComponentName> [Category] [--dry-run] [--force]
 * 
 * Examples:
 *   node scripts/scaffold-story.mjs AddressCard Molecules
 *   node scripts/scaffold-story.mjs OrderStatusTimeline Organisms
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
Unwind & Doodle Story Scaffolder

Usage:
  node scripts/scaffold-story.mjs <ComponentName> [Category] [flags]

Categories:
  Atoms, Molecules, Organisms (default: Molecules)

Flags:
  --dry-run   Print generated story code to stdout without writing
  --force     Overwrite existing story file if it already exists
  --help, -h  Show this help screen
`);
  process.exit(0);
}

const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');
const positionalArgs = args.filter((a) => !a.startsWith('--') && !a.startsWith('-'));

const componentName = positionalArgs[0];
const category = positionalArgs[1] || 'Molecules';

if (!componentName) {
  console.error('Error: Please provide a component name (e.g., AddressCard).');
  process.exit(1);
}

const targetPath = path.join(ROOT_DIR, 'src', 'components', `${componentName}.stories.tsx`);

if (fs.existsSync(targetPath) && !isForce && !isDryRun) {
  console.error(`Error: File already exists at ${targetPath}. Use --force to overwrite.`);
  process.exit(1);
}

const template = `import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within, userEvent, fn } from 'storybook/test';
import React from 'react';
import ${componentName} from './${componentName}';

const meta = {
  title: 'Design System/${category}/${componentName}',
  component: ${componentName},
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Canonical ${componentName} ${category.toLowerCase()} conforming directly to Figma design system specifications. Implements canonical tokens, accessibility standards, and responsive behaviors.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    // Define interactive story controls here
    onAction: { action: 'action' },
  },
  args: {
    onAction: fn(),
  },
} satisfies Meta<typeof ${componentName}>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 01. Default Canonical Variant
 * Baseline canonical presentation adhering to Figma specifications.
 */
export const Default: Story = {
  args: {},
};

/**
 * 02. Secondary Variant / Scale
 * Secondary variant or alternate sizing scale.
 */
export const Secondary: Story = {
  args: {},
};

/**
 * 03. Alternative State / Mode
 * Inverse, compact, or alternate structural layout mode.
 */
export const AlternativeMode: Story = {
  args: {},
};

/**
 * 04. With Optional Elements / Features
 * Toggles optional boolean subcomponents, action buttons, or indicator badges.
 */
export const WithOptionalElements: Story = {
  args: {},
};

/**
 * 05. Loading State
 * Operational loading feedback composing canonical Spinner or Skeleton atoms.
 */
export const Loading: Story = {
  args: {},
};

/**
 * 06. Success / Active State
 * Positive confirmation, active selection, or completed state view.
 */
export const Success: Story = {
  args: {},
};

/**
 * 07. Error / Disabled State
 * Resilient recovery alert, validation message, or disabled interaction state.
 */
export const ErrorState: Story = {
  args: {},
};

/**
 * 08. Authentic Scenario
 * Realistic storefront / account order domain scenario with rich real-world data.
 */
export const AuthenticScenario: Story = {
  args: {},
};

/**
 * 09. Interactive Play Test
 * Automated verification of user interaction, keyboard navigation, and callback invocation.
 */
export const InteractivePlay: Story = {
  args: {
    onAction: fn(),
  },
  play: async ({ canvasElement, args }) => {
    // 1. Isolate mocks across stories
    (args.onAction as any)?.mockClear?.();

    // 2. Wait for modal/dialog mount autofocus timers (if applicable)
    await new Promise((r) => setTimeout(r, 100));

    const canvas = within(canvasElement);

    // Add interactive assertions here
    // Example:
    // const trigger = canvas.getByRole('button');
    // await userEvent.click(trigger);
    // await expect(args.onAction).toHaveBeenCalledTimes(1);
  },
};

/**
 * 10. CSS Token Verification
 * Asserts computed styles adhere strictly to design tokens without arbitrary fallbacks.
 */
export const CssCheck: Story = {
  args: {
    'data-testid': 'css-check-${componentName.toLowerCase()}',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const element = canvas.getByTestId('css-check-${componentName.toLowerCase()}');
    await expect(element).toBeInTheDocument();

    const computed = window.getComputedStyle(element);

    // Verify token surface (#FFFFFF or #F4F8FA)
    // await expect(computed.backgroundColor).toBe('rgb(255, 255, 255)');

    // Verify token border (#EDF3F7)
    // await expect(computed.borderColor).toBe('rgb(237, 243, 247)');

    // Verify typography
    // await expect(computed.fontFamily).toMatch(/Fredoka|Plus Jakarta Sans/i);
  },
};
`;

if (isDryRun) {
  console.log('--- [DRY RUN] Generated ' + targetPath + ' ---');
  console.log(template);
} else {
  fs.writeFileSync(targetPath, template, 'utf8');
  console.log('✓ Successfully generated story suite: ' + path.relative(ROOT_DIR, targetPath));
  console.log('  Component: ' + componentName);
  console.log('  Category:  Design System/' + category + '/' + componentName);
  console.log('  Stories:   10 canonical stories scaffolded');
}
