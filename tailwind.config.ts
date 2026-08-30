import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: '#F472B6',
          'pink-dark': '#EC4899',
          'pink-light': '#FCE7F3',
          blue: '#38BDF8',
          'blue-soft': '#93C5FD',
          'blue-light': '#E0F2FE',
          cream: '#FFFDF7',
          yellow: '#FEF3C7',
          footer: '#1E3A5F',
        },
      },
      fontFamily: {
        heading: ['Fredoka', 'cursive', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'sans-serif'],
        script: ['Pacifico', 'cursive'],
      },
    },
  },
  plugins: [],
};

export default config;
