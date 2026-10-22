/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Plus Jakarta Sans Variable', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Bricolage Grotesque Variable', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        hand: ['Caveat', 'cursive'],
      },
      // ScriptMark palette (approved 22 Oct 2026): dark navy for the menu,
      // royal blue for actions, gold as a small accent. Pages use these
      // names (bg-brand-500, bg-ink-950, text-gold-600) rather than raw
      // Tailwind colours, so the theme can change here in one place.
      colors: {
        ink: {
          950: '#081526',
          900: '#0C1D33',
          800: '#12284A',
        },
        brand: {
          50: '#F0F5FC',
          100: '#E6EFFA',
          200: '#C3D7F1',
          300: '#8FB4E6',
          400: '#4F87CF',
          500: '#1F5FAD',
          600: '#1A519A',
          700: '#174A8B',
          800: '#133B6E',
          900: '#0F2E55',
          950: '#0A1D36',
        },
        gold: {
          50: '#FDF7E9',
          100: '#FBF1DC',
          200: '#F4DDA6',
          400: '#E8B64A',
          500: '#E0A526',
          600: '#B9861A',
          700: '#7A5410',
        },
      },
    },
  },
  plugins: [],
}
