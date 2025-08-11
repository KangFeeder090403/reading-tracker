/********************
 Tailwind Config
********************/
/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,html}',
  ],
  theme: {
    extend: {
      colors: {
        base: {
          wine: '#5e2534',
          purple: '#2e1825',
          blue: '#273c4b',
          dark: '#232c3a',
          light: '#b5c2c7'
        },
        accent: {
          amethyst: '#ae3ec3',
          dullgold: '#b48905'
        }
      },
      fontFamily: {
        gothic: ['"UnifrakturMaguntia"', 'Memela Fraktur', 'serif'],
        body: ['"Junicode"', 'serif'],
        ui: ['"Albertus Nova"', 'Albertus', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        frame: 'inset 0 0 0 1px rgba(180,137,5,0.35), 0 0 20px rgba(174,62,195,0.25)'
      },
      backgroundImage: {
        "vampyric": 'radial-gradient(1200px 600px at 10% -10%, rgba(174,62,195,0.12), transparent), radial-gradient(900px 400px at 110% 110%, rgba(180,137,5,0.10), transparent)'
      }
    }
  },
  plugins: [typography]
}
