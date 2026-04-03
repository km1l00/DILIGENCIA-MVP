import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'franco-blue': '#254B59',
        'franco-blue-light': '#2E5E70',
        'franco-blue-dark': '#1D3A45',
        'franco-gold': '#EABC1F',
        'franco-gold-light': '#F0CB45',
        'franco-gold-dark': '#C9A018',
        'brass': '#EABC1F',
        'brass-light': '#F0CB45',
        'navy-deep': '#1D3A45',
        'navy-medium': '#254B59',
        'port-red': '#e05252',
        'starboard-green': '#2ecc71',
        'amber-warning': '#e2a92b',
        sidebar: {
          DEFAULT: '#1D3A45',
          accent: '#254B59',
          border: 'rgba(234,188,31,0.15)',
        },
        // Tema claro
        card: '#FFFFFF',
        border: 'rgba(37,75,89,0.15)',
      },
      fontFamily: {
        sans: ['var(--font-syne)', 'Roboto', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
