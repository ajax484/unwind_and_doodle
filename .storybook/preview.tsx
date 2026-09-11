import type { Preview } from '@storybook/nextjs-vite';
import React from 'react';
import '../src/app/globals.css';

const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      test: 'todo',
    },
  },
  decorators: [
    (Story) => (
      <div className="font-body text-text-primary antialiased">
        <Story />
      </div>
    ),
  ],
};

export default preview;