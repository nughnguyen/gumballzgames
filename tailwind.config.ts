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
        // Chess.com Inspired Palette - Solid Colors Only
        primary: {
          DEFAULT: '#312e2b',
          light: '#3d3a36',
          dark: '#262522',
        },
        secondary: {
          DEFAULT: '#262522',
          light: '#312e2b',
          dark: '#1a1816',
        },
        board: {
          light: '#eeeed2',
          dark: '#769656',
        },
        accent: {
          green: '#81b64c',
          blue: '#7fa9d1',
          orange: '#e58a3c',
        },
        text: {
          primary: '#ffffff',
          secondary: '#b3b3b3',
          tertiary: '#7a7a7a',
        },
        border: {
          primary: '#3d3d3d',
          secondary: '#2a2825',
        },
        status: {
          online: '#81b64c',
          offline: '#666666',
          away: '#e58a3c',
        },
        game: {
          win: '#81b64c',
          lose: '#d84949',
          draw: '#7a7a7a',
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
