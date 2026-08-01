import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#0f172a',
        panel: '#111827',
        border: '#1f2937',
        accent: '#22c55e',
      },
      boxShadow: {
        soft: '0 12px 30px rgba(15, 23, 42, 0.18)',
      },
    },
  },
  plugins: [],
}

export default config
