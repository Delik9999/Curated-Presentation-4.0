import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(210 40% 98%)',
        foreground: 'hsl(222 47% 11%)',
        muted: 'hsl(210 16% 93%)',
        border: 'hsl(214 32% 91%)',
        card: {
          DEFAULT: 'hsl(0 0% 100%)',
          foreground: 'hsl(222 47% 11%)',
        },
        accent: 'hsl(25 85% 55%)',
        primary: {
          DEFAULT: 'hsl(222 47% 20%)',
          foreground: 'hsl(210 40% 98%)',
        },
        secondary: {
          DEFAULT: 'hsl(210 25% 96%)',
          foreground: 'hsl(222 47% 20%)',
        },
      },
      borderRadius: {
        '2xl': '1.25rem',
        xl: '0.95rem',
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(15, 23, 42, 0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
