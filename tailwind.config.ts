import type { Config } from 'tailwindcss';

// Colours resolve to CSS variables in styles/tokens.css so tokens stay the single source.
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './resources/js/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { primary: token('brand-primary'), forest: token('brand-forest'), mint: token('brand-mint') },
        surface: { white: token('surface-white'), canvas: token('surface-canvas') },
        accent: { amber: token('accent-amber'), 'amber-text': token('accent-amber-text'), 'amber-soft': token('accent-amber-soft') },
        ink: { DEFAULT: token('ink'), muted: token('ink-muted'), subtle: token('ink-subtle') },
        line: { DEFAULT: token('line'), strong: token('line-strong') },
        danger: { DEFAULT: token('danger'), soft: token('danger-soft') },
        success: { DEFAULT: token('success'), soft: token('success-soft') },
        info: { DEFAULT: token('info'), soft: token('info-soft') },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      borderRadius: { card: 'var(--radius-card)', control: 'var(--radius-control)' },
      boxShadow: { card: 'var(--shadow-card)', raised: 'var(--shadow-raised)' },
      minHeight: { touch: '44px', dvh: '100dvh' },
      minWidth: { touch: '44px' },
      height: { dvh: '100dvh' },
    },
  },
  plugins: [],
} satisfies Config;
