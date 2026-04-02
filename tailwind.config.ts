import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'navy': '#0a0f1e',
        'navy-light': '#0d1526',
        'navy-border': '#1a2540',
        'accent-cyan': '#00d4ff',
        'accent-green': '#10B981',
        'mutant-red': '#EF4444',
        'wildtype-blue': '#3B82F6',
        'normal-green': '#10B981',
      },
      fontFamily: {
        serif: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
export default config
