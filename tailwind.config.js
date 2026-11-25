/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Reading text: built for legibility. Readouts: an instrument-panel face.
        sans: ['"Atkinson Hyperlegible"', 'system-ui', 'sans-serif'],
        display: ['"Barlow Condensed"', '"Arial Narrow"', 'sans-serif'],
        mono: ['"Barlow Condensed"', 'monospace'],
      },
      colors: {
        // A dim control room around one bright monitor. Each accent means one thing.
        room: '#0B1826',
        panel: '#11233A',
        raised: '#183150',
        line: '#24405F',
        ink: { DEFAULT: '#E9F0F7', soft: '#A9BDD2', faint: '#6F89A3' },
        drape: { DEFAULT: '#4C9BE8', deep: '#2F78C4', soft: '#4C9BE833' },
        xray: { DEFAULT: '#FFB21A', soft: '#FFB21A26' },
        ecg: '#39D98A',
        alarm: '#FF6B5E',
        // Artery colours (validated for colour-blind readers), the same in every view.
        artery: { lm: '#C9D3DE', lad: '#E76624', lcx: '#338CED', rca: '#00A888' },
      },
      fontSize: {
        // Base 15 px; the smallest text in the app is 13 px.
        xs: ['0.8125rem', { lineHeight: '1.15rem' }],
        sm: ['0.875rem', { lineHeight: '1.3rem' }],
        base: ['0.9375rem', { lineHeight: '1.45rem' }],
      },
      keyframes: {
        'panel-in': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        pop: { '0%': { opacity: '0', transform: 'scale(0.92)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        lamp: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.55' } },
      },
      animation: {
        'panel-in': 'panel-in 180ms ease-out both',
        pop: 'pop 160ms ease-out both',
        lamp: 'lamp 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
