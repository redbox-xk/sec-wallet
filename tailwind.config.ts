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
        // Deep space background
        space: {
          DEFAULT: '#0B1026',
          light: '#1A1F35',
        },
        // Neon soft accents
        neon: {
          lavender: '#9D7BEF',
          teal: '#00FFD1',
          magenta: '#D66BA0',
        },
        // Guardian alerts
        guardian: {
          info: '#3B82F6',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
        },
      },
      animation: {
        'soft-pulse': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(157, 123, 239, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(157, 123, 239, 0.8)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
export default config;
