import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-open-sans)', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#34A853',
          hover: '#2D9348',
        },
        secondary: {
          DEFAULT: '#1A73E8',
          hover: '#1557B0',
        },
        'light-gray': '#E9ECEF',
      },
    },
  },
  plugins: [],
}

export default config 