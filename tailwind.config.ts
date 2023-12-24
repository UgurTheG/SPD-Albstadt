import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './**/*.{js,css,ts,jsx,tsx,mdx}',
    './**/*.{js,css,ts,jsx,tsx,mdx}',
    './**/*.{js,css,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      fontFamily: {
        'fontText': ['"Font-Text"', 'sans-serif'], // Replace 'Font-Text' with your actual font name
      }
    },
  },
  plugins: [],
}
export default config
