import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Unified Theme mapped to CSS Variables
        primary: {
          DEFAULT: 'var(--bg-primary)',
          light: 'var(--bg-tertiary)', // Mapping light to tertiary for lighter shade
          dark: '#020617', // Manual Darkest
        },
        secondary: {
          DEFAULT: 'var(--bg-secondary)',
          light: 'var(--bg-tertiary)',
          dark: 'var(--bg-primary)',
        },
        board: {
          light: 'var(--bg-board-light)',
          dark: 'var(--bg-board-dark)',
        },
        accent: {
          green: 'var(--accent-green)',
          blue: 'var(--accent-blue)',
          orange: 'var(--accent-orange)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        border: {
          primary: 'var(--border-primary)',
          secondary: 'var(--border-secondary)',
        },
        status: {
          online: 'var(--status-online)',
          offline: 'var(--status-offline)',
          away: 'var(--status-away)',
        },
        game: {
          win: 'var(--game-win)',
          lose: 'var(--game-lose)',
          draw: 'var(--game-draw)',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
