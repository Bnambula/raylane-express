import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          DEFAULT: '#0B2545',
          mid: '#1A3A6B',
          light: '#2656A0',
        },
        gold: {
          DEFAULT: '#E8A020',
          soft: '#F5C04A',
          pale: '#FDF3DC',
        },
        earth: '#EAE5D8',
        warm: '#F8F6F1',
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
export default config
