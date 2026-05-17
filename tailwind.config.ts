import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#E8A0BF',
        'primary-dark': '#C4779B',
        'primary-light': '#F5C6D8',
        accent: '#BAD7E9',
        bg: '#FFF5F8',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Hiragino Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
