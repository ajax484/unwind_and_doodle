import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-mcp",
  ],
  framework: "@storybook/nextjs-vite",
  "features": {
    "componentsManifest": true,
  },
  staticDirs: ["..\\public"],
  async viteFinal(config) {
    config.server = config.server || {};
    config.server.watch = config.server.watch || {};
    const existingIgnored = config.server.watch.ignored;
    config.server.watch.ignored = [
      ...(Array.isArray(existingIgnored)
        ? existingIgnored
        : existingIgnored
        ? [existingIgnored]
        : []),
      '**/storybook-static/**',
      '**/.next/**',
    ];
    return config;
  },
};
export default config;
